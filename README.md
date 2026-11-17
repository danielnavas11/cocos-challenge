# Cocos — Challenge

API REST construida con **NestJS + TypeORM + PostgreSQL** para:

1. Consultar el **portfolio** de un usuario (valor total, pesos disponibles y posiciones con valor de mercado y rendimiento).
2. **Buscar activos** por ticker y/o nombre.
3. **Enviar órdenes** al mercado (`BUY` / `SELL`, `MARKET` / `LIMIT`) y **cancelar** órdenes pendientes (`NEW`).
4. Registrar **transferencias** de efectivo (`CASH_IN` / `CASH_OUT`) modeladas como órdenes.

> Todos los precios y montos están expresados en **pesos argentinos (ARS)**. No se simula el mercado: no hay motor de matching.

---

## Índice

- [Stack tecnológico](#stack-tecnológico)
- [Requisitos](#requisitos)
- [Configuración](#configuración)
- [Ejecución](#ejecución)
- [Endpoints](#endpoints)
- [Reglas de negocio](#reglas-de-negocio)
- [Arquitectura](#arquitectura)
- [Modelo de datos](#modelo-de-datos)
- [Tests](#tests)
- [Scripts disponibles](#scripts-disponibles)

---

## Stack tecnológico

| Componente      | Tecnología                                   |
|-----------------|----------------------------------------------|
| Lenguaje        | TypeScript 5                                 |
| Runtime         | Node.js 22                                   |
| Framework       | NestJS 10 (`@nestjs/config`, `@nestjs/typeorm`) |
| ORM             | TypeORM 0.3                                  |
| Base de datos   | PostgreSQL 14.5                              |
| Precisión       | `decimal.js` + columnas `numeric(10, 2)`     |
| Validación      | `class-validator` / `class-transformer`      |
| Testing         | Jest, `@nestjs/testing`, `supertest`         |

---

## Requisitos

- Node.js 22 y npm
- Docker y Docker Compose (para levantar PostgreSQL y la API localmente)

---

## Configuración

Copiar el archivo de ejemplo y completar las variables:

```bash
cp .env-example .env
```

| Variable            | Descripción                                                          | Ejemplo      |
|---------------------|----------------------------------------------------------------------|--------------|
| `ENV`               | Entorno de ejecución                                                 | `local`      |
| `PORT`              | Puerto HTTP de la API (default `3000`)                               | `3000`       |
| `DATABASE_HOST`     | Host de PostgreSQL                                                   | `localhost`  |
| `DATABASE_PORT`     | Puerto de PostgreSQL                                                 | `5432`       |
| `DATABASE_USERNAME` | Usuario de la base                                                   | `postgres`   |
| `DATABASE_PASSWORD` | Contraseña de la base                                                | `postgres`   |
| `DATABASE_NAME`     | Nombre de la base                                                    | `db`         |
| `DATABASE_SCHEMA`   | Schema                                                               | `public`     |
| `SHOW_SQL`          | Loguea las queries SQL de TypeORM                                    | `true`       |
| `USE_LOCAL_BD`      | `true`: levanta API + PostgreSQL con Docker. `false`: corre `npm run start:dev` contra una base externa | `true` |

> Con `NODE_ENV=production` la conexión a PostgreSQL se realiza con SSL.

---

## Ejecución

### Con el script local (recomendado)

```bash
npm install
./run_local.sh
```

- Si `USE_LOCAL_BD=true`, se ejecuta `docker compose up --build cocos-api-local`, que levanta:
  - `postgres` (14.5), inicializado con `init-db/database.sql` (esquema y datos de ejemplo).
  - `cocos-api-local`, la API construida a partir del `Dockerfile`.
- Si `USE_LOCAL_BD=false`, se ejecuta `npm run start:dev` usando la base configurada en `.env`.

### Manualmente

```bash
npm install
npm run start:dev      # modo watch
# o
npm run build && npm run start:prod
```

La API queda disponible en `http://localhost:${PORT}` (por defecto `http://localhost:3000`).

---

## Endpoints

En `collection/api-resquest.http` hay una colección de requests lista para ejecutar desde el cliente HTTP de IntelliJ o VS Code (extensión REST Client), con casos felices y de error.

### Health

```http
GET /health
```

```json
{ "status": "ok" }
```

### Portfolio

```http
GET /portfolio/:userId
```

Respuesta:

```json
{
  "totalAccountValue": 1000000.00,
  "availableCash": 750000.00,
  "positions": [
    {
      "instrumentId": 47,
      "ticker": "PAMP",
      "name": "Pampa Holding S.A.",
      "type": "ACCIONES",
      "size": 40,
      "marketValue": 250000.00,
      "totalReturn": 12.5,
      "dailyReturn": -1.2
    }
  ]
}
```

| Campo               | Descripción                                                                  |
|---------------------|------------------------------------------------------------------------------|
| `totalAccountValue` | `availableCash` + suma de `marketValue` de las posiciones                    |
| `availableCash`     | Pesos disponibles calculados a partir de órdenes `FILLED`                    |
| `size`              | Cantidad neta de acciones (solo se listan posiciones con `size > 0`)         |
| `marketValue`       | `size * close` del último registro de `marketdata`                           |
| `totalReturn`       | Rendimiento total (%) del valor de mercado vs. el costo promedio de compra   |
| `dailyReturn`       | Rendimiento diario (%) `close` vs. `previousClose`                           |

Errores: `400` si el `userId` no es numérico, `404` si el usuario no existe.

### Búsqueda de activos

```http
GET /instruments?query=PAMP
```

Busca coincidencias parciales, sin distinguir mayúsculas/minúsculas (`ILIKE`), por **ticker** o **nombre**.

```json
[
  { "id": 47, "ticker": "PAMP", "name": "Pampa Holding S.A.", "type": "ACCIONES" }
]
```

Errores: `400` si `query` no se envía, está vacío o supera los 255 caracteres.

### Enviar orden

```http
POST /orders
Content-Type: application/json
```

| Campo          | Tipo                                         | Obligatorio                                  |
|----------------|----------------------------------------------|----------------------------------------------|
| `userId`       | entero ≥ 1                                   | Sí                                           |
| `instrumentId` | entero ≥ 1                                   | Solo para `BUY` / `SELL`                     |
| `side`         | `BUY` \| `SELL` \| `CASH_IN` \| `CASH_OUT`   | Sí                                           |
| `type`         | `MARKET` \| `LIMIT`                          | Sí                                           |
| `size`         | entero ≥ 1                                   | Exactamente uno entre `size` y `amount`      |
| `amount`       | número (máx. 2 decimales) ≥ 0.01             | Exactamente uno entre `size` y `amount`      |
| `price`        | número (máx. 2 decimales)                    | Solo para `LIMIT`                            |

Ejemplos:

```json
// Compra MARKET por cantidad
{ "userId": 1, "instrumentId": 47, "side": "BUY", "type": "MARKET", "size": 10 }

// Compra MARKET por monto en ARS
{ "userId": 1, "instrumentId": 47, "side": "BUY", "type": "MARKET", "amount": 10000 }

// Venta LIMIT
{ "userId": 1, "instrumentId": 54, "side": "SELL", "type": "LIMIT", "size": 1, "price": 900 }

// Depósito de efectivo
{ "userId": 1, "type": "MARKET", "side": "CASH_IN", "size": 100000 }
```

Respuesta:

```json
{
  "id": 25,
  "userId": 1,
  "instrumentId": 47,
  "size": 10,
  "price": 925.85,
  "type": "MARKET",
  "side": "BUY",
  "status": "FILLED",
  "datetime": "2026-11-17T19:24:00.000Z"
}
```

Errores:

| Código | Motivo                                                                                     |
|--------|--------------------------------------------------------------------------------------------|
| `400`  | Body inválido, `size` y `amount` juntos o ausentes, `LIMIT` sin `price`, transferencia no `MARKET`, `BUY`/`SELL` sobre el instrumento `ARS` |
| `404`  | Usuario o instrumento inexistente                                                          |
| `422`  | No hay precio de mercado válido para una orden `MARKET`                                    |

> Una orden sin fondos o tenencia suficientes **no** devuelve error: se persiste y se devuelve con `status: "REJECTED"`.

### Cancelar orden

```http
DELETE /orders/:id/cancel
```

Solo se pueden cancelar órdenes en estado `NEW`; el estado pasa a `CANCELLED`.

Errores: `400` si el id no es numérico, `404` si la orden no existe, `409` si la orden no está en estado `NEW`.

---

## Reglas de negocio

### Saldo y tenencias

- La **fuente de verdad** es la tabla `orders`. El portfolio se calcula solo con órdenes `FILLED`:
  - Pesos disponibles = `CASH_IN` + ventas (`size * price`) − `CASH_OUT` − compras (`size * price`).
  - Acciones por activo = `SUM(size)` de `BUY` − `SUM(size)` de `SELL`.
- Al **validar una nueva orden**, además de las `FILLED`, se consideran las órdenes `LIMIT` pendientes (`NEW`):
  - Un `BUY` pendiente **reserva** pesos (`size * price`).
  - Un `SELL` pendiente **reserva** acciones.

  Así se evita comprometer dos veces el mismo saldo o la misma tenencia.

### Tipos de orden

| Tipo     | Precio                                      | Estado si es válida |
|----------|---------------------------------------------|---------------------|
| `MARKET` | Último `close` de `marketdata`              | `FILLED`            |
| `LIMIT`  | `price` enviado por el usuario              | `NEW`               |

### Cálculo de cantidad

- Si se envía `amount`: `size = floor(amount / precio)`. No se admiten fracciones de acciones.
- Si el `size` resultante es menor a 1, la orden queda `REJECTED`.

### Validaciones y rechazos

| Lado       | Condición para no ser rechazada              |
|------------|----------------------------------------------|
| `BUY`      | `size * price <= pesos disponibles`          |
| `SELL`     | `size <= acciones disponibles del activo`    |
| `CASH_IN`  | Siempre válida                               |
| `CASH_OUT` | `size <= pesos disponibles`                  |

Las transferencias (`CASH_IN` / `CASH_OUT`) se registran sobre el instrumento `ARS` (`type = 'MONEDA'`) con `price = 1` y deben ser de tipo `MARKET`.

### Concurrencia

La creación y cancelación de órdenes se ejecutan dentro de una **transacción** (`UnitOfWorkService`), bloqueando el registro del usuario (`SELECT ... FOR UPDATE`) para evitar race conditions sobre el saldo disponible.

---

## Arquitectura

El código está organizado por dominio (vertical slices), siguiendo los principios SOLID:

```
src/
├── config/              # Configuración tipada desde variables de entorno
├── database/
│   ├── entities/        # Entidades TypeORM (User, Instrument, Market, Order)
│   ├── repositories/    # Interfaces + implementaciones, inyectadas por token
│   ├── decimal-transformer.ts
│   └── unit-of-work.service.ts   # Transacciones con repositorios transaccionales
├── health/              # GET /health
├── instruments/         # Búsqueda de activos
├── orders/
│   ├── domain/          # AccountBalance, OrderSize, constantes
│   ├── dto/
│   └── strategies/
│       ├── types/       # MarketOrderStrategy, LimitOrderStrategy
│       └── orders/      # Buy/Sell/CashIn/CashOut handlers
└── portfolio/
    ├── domain/          # PortfolioLedger, PositionBalance, valuación
    └── dto/
```

Decisiones principales:

- **Controllers sin lógica de negocio:** solo reciben la request, validan y delegan al servicio.
- **Strategy Pattern:** el tipo de orden (`MARKET` / `LIMIT`) define el precio y el estado final, y el lado (`BUY`, `SELL`, `CASH_IN`, `CASH_OUT`) define el instrumento y la validación de saldo. Para agregar un nuevo tipo (por ejemplo `STOP_LOSS`) basta con registrar una nueva estrategia, sin tocar `OrdersService`.
- **Inversión de dependencias:** los servicios dependen de interfaces de repositorio inyectadas por *injection tokens*, no del `Repository` de TypeORM. Esto permite testearlos sin base de datos.
- **DTOs de salida:** las entidades nunca se exponen directamente; se mapean con *mappers* dedicados.
- **Precisión numérica:** los cálculos se hacen con `decimal.js` y se persisten como `numeric(10, 2)`.
- **Esquema gestionado fuera de la app:** `synchronize: false`. El esquema inicial está en `init-db/database.sql` solo en modo local.
- **Graceful shutdown:** `app.enableShutdownHooks()` cierra el pool de conexiones ante `SIGTERM` / `SIGINT`.

---

## Modelo de datos

| Tabla         | Campos principales                                                                              |
|---------------|-------------------------------------------------------------------------------------------------|
| `users`       | `id`, `email`, `accountnumber`                                                                  |
| `instruments` | `id`, `ticker`, `name`, `type` (`ACCIONES`, `MONEDA`)                                            |
| `marketdata`  | `id`, `instrumentid`, `high`, `low`, `open`, `close`, `previousclose`, `date`                   |
| `orders`      | `id`, `instrumentid`, `userid`, `size`, `price`, `type`, `side`, `status`, `datetime`           |

El efectivo en pesos se modela como el instrumento `ARS` con `type = 'MONEDA'`.

---

## Tests

```bash
npm test            # tests unitarios
npm run test:cov    # tests unitarios + reporte de cobertura (carpeta coverage/)
npm run test:e2e    # tests end-to-end
```

Los tests unitarios (`*.spec.ts`, junto a cada archivo) cubren servicios, estrategias, cálculos de dominio, DTOs, pipes, mappers y repositorios, incluyendo casos borde como saldo insuficiente, monto menor al precio de una acción, `size` y `amount` enviados a la vez y cancelación de órdenes ya ejecutadas. El objetivo de cobertura es como mínimo **80%**.

---

## Scripts disponibles

| Script                | Descripción                         |
|-----------------------|-------------------------------------|
| `npm run start`       | Inicia la aplicación                |
| `npm run start:dev`   | Inicia en modo watch                |
| `npm run start:debug` | Inicia en modo debug + watch        |
| `npm run start:prod`  | Ejecuta el build (`dist/main`)      |
| `npm run build`       | Compila el proyecto                 |
| `npm run lint`        | Ejecuta ESLint con `--fix`          |
| `npm run format`      | Formatea con Prettier               |
| `npm test`            | Tests unitarios                     |
| `npm run test:cov`    | Tests con cobertura                 |
| `npm run test:e2e`    | Tests end-to-end                    |
