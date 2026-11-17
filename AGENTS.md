# AGENTS.md — Trading & Portfolio API

## 1. Descripción del Proyecto
API REST para:
1. Consultar el **portfolio** de un usuario (valor total, pesos disponibles y activos con cantidad, valor de mercado y rendimiento).
2. **Buscar activos** por ticker y/o nombre.
3. **Enviar órdenes** al mercado (`BUY` / `SELL`, `MARKET` / `LIMIT`) y **cancelar** órdenes en estado `NEW`.
4. Registrar **transferencias** de efectivo (`CASH_IN` / `CASH_OUT`) modeladas como órdenes.

Todos los precios y montos están en **pesos argentinos (ARS)**. **No se simula el mercado** (no hay motor de matching).

---

## 2. Stack Tecnológico y Entorno
- **Lenguaje:** TypeScript 5.1
- **Runtime:** Node.js 22 (ESM / TypeScript estricto)
- **Framework:** NestJS 10 (`@nestjs/config`, `@nestjs/typeorm`)
- **ORM:** TypeORM 0.3
- **Base de Datos:** PostgreSQL 14.5
- **Manejo Numérico:** PostgreSQL `numeric(10, 2)` mapeado vía `DecimalTransformer` (`src/database/decimal-transformer.ts`)
- **Validación:** `class-validator` y `class-transformer`
- **Testing:** Jest + `@nestjs/testing` + `supertest`.
- **Ejecución local:** `./run_local.sh` (Docker Compose con `.env`).

---

## 3. Principios SOLID Aplicados al Dominio
El agente **debe** respetar los 5 principios SOLID en cada módulo, servicio y clase que genere:

1. **S — Single Responsibility Principle (Responsabilidad Única):**
    - Cada clase tiene una única razón para cambiar.
    - Los `Controllers` **solo** reciben peticiones HTTP, delegan al servicio y devuelven DTOs de respuesta; cero lógica de negocio en controladores.
2. **O — Open/Closed Principle (Abierto/Cerrado):**
    - El sistema debe estar abierto a la extensión y cerrado a la modificación.
    - Modelar el procesamiento de tipos de orden (`MARKET` vs `LIMIT`) y lados de operación (`BUY`, `SELL`, `CASH_IN`, `CASH_OUT`) mediante **Strategy Pattern** o handlers desacoplados, permitiendo agregar nuevos tipos de orden (ej. `STOP_LOSS`) sin modificar los `if/else` centrales.
3. **L — Liskov Substitution Principle (Sustitución de Liskov):**
    - Cualquier implementación de una interfaz de repositorio, estrategia de orden o calculadora de precios debe poder sustituirse sin alterar el comportamiento esperado ni romper contratos (tipos de retorno, excepciones de dominio).
4. **I — Interface Segregation Principle (Segregación de Interfaces):**
    - Definir interfaces pequeñas y cohesivas en lugar de interfaces monolíticas que obliguen a los consumidores a depender de métodos que no utilizan.
5. **D — Dependency Inversion Principle (Inversión de Dependencias):**
    - Los servicios de dominio (alto nivel) **no deben depender directamente** de detalles de infraestructura como el `Repository<Order>` de TypeORM o consultas SQL crudas.
    - Depender de abstracciones/interfaces inyectadas mediante **Injection Tokens** de NestJS (`@Inject(ORDER_REPOSITORY)`), facilitando el testing unitario sin levantar una base de datos real.

---

## 4. Mejores Prácticas de Node.js 22, NestJS y TypeORM
- **Estructura Modular por Dominio (Vertical Slices):** Organizar por funcionalidad (`portfolio/`, `instruments/`, `orders/`, `marketdata/`, `users/`, `common/`), evitando carpetas horizontales globales (`controllers/`, `services/`) que acoplan módulos.
- **Cero dependencias circulares:** Prohibido usar `forwardRef()`. Si dos módulos se necesitan mutuamente, extraer la lógica compartida a un tercer módulo o usar eventos de dominio.
- **DTOs vs Entidades:** Nunca exponer entidades de TypeORM directamente en las respuestas de los endpoints. Mapear siempre a DTOs de salida explícitos para evitar fugas de esquema y problemas de serialización.
- **Precisión Matemática Financiera:** Evitar errores de punto flotante nativos de JS en precios y montos en ARS. Utilizar `numeric`/`decimal` en PostgreSQL y operar con precisión controlada (`decimal.js` o enteros en centavos según corresponda).
- **Transacciones Atómicas y Concurrencia:** Toda operación de creación o cancelación de órdenes debe ejecutarse dentro de una transacción (`DataSource.transaction` o `QueryRunner`), asegurando que todas las operaciones internas usen el `EntityManager` transaccional para evitar condiciones de carrera sobre el saldo disponible.
- **TypeORM Seguro en Producción:** Prohibido `synchronize: true`. Toda modificación de esquema debe gestionarse mediante migraciones explícitas y revisadas. Evitar relaciones `eager: true` globales para prevenir consultas N+1.
- **Configuración y Fail-Fast:** Validar todas las variables de entorno al arranque con `@nestjs/config` + esquema de validación (`Joi` o `Zod`). Si falta una variable crítica de PostgreSQL, la aplicación debe fallar inmediatamente al iniciar.
- **Manejo Centralizado de Errores y Logging:**
    - Implementar un `GlobalExceptionFilter` que capture errores de dominio y de base de datos, devolviendo respuestas HTTP consistentes sin filtrar stack traces ni SQL interno.
    - Usar el `Logger` estructurado de NestJS (o Pino); prohibido `console.log`.
- **Graceful Shutdown:** Habilitar `app.enableShutdownHooks()` en `main.ts` para cerrar correctamente el pool de conexiones de PostgreSQL ante señales `SIGTERM`/`SIGINT`.

---

## 5. Arquitectura y Convenciones de Código
- **Arquitectura Modular (NestJS):** Organizar el código por dominios funcionales (`portfolio`, `instruments`, `orders`, `health`, etc.). Cada dominio con su `*.module.ts`, `*.controller.ts`, `*.service.ts` y `dto/`.
- **Separación de Responsabilidades:**
    - `Controllers`: Solo manejo de HTTP, validación de DTOs y serialización de respuestas. Prohibida la lógica de negocio aquí.
    - `Services`: Toda la lógica financiera, validaciones de saldo/tenencia y cálculos.
    - `Repositories / Entities`: Mapeo estricto con TypeORM.
- **Precisión Numérica:**
    - Utilizar el helper `columnDecimalDefault` (`src/database/helpers.ts`) para campos monetarios/precios.
    - Para operaciones aritméticas acumulativas en memoria, evitar errores de punto flotante de JavaScript (`0.1 + 0.2 !== 0.3`) usando decimal.js.
- **Transaccionalidad:** Toda creación o cancelación de órdenes que afecte saldos o posiciones debe ejecutarse dentro de una transacción de base de datos (`DataSource.transaction` / `QueryRunner`) para evitar condiciones de carrera (race conditions).

---

## 6. Modelo de Datos y Conceptos Clave

### Entidades TypeORM Existentes (`src/database/entities/`)
1. **`User` (`users`)**:
    - `id`: `number` (PK)
    - `email`: `string`
    - `accountNumber` (columna `accountnumber`): `string`
2. **`Instrument` (`instruments`)**:
    - `id`: `number` (PK)
    - `ticker`: `string`
    - `name`: `string`
    - `type`: `string` (`ACCIONES`, `MONEDA`)
    - *Nota:* El efectivo en pesos argentinos (**ARS**) está modelado como un instrumento con `type = 'MONEDA'` y `ticker = 'ARS'`.
3. **`Market` (`marketdata`)**:
    - `id`: `number` (PK)
    - `instrumentId` (columna `instrumentid`): `number`
    - `high`, `low`, `open`, `close`, `previousClose` (columna `previousclose`): `number` (`numeric(10, 2)`)
    - `date`: `string` (`date`)
4. **`Order` (`orders`)**:
    - `id`: `number` (PK)
    - `instrumentId` (columna `instrumentid`): `number`
    - `userId` (columna `userid`): `number`
    - `size`: `number` (`int`, cantidad de acciones o monto nominal para transferencias)
    - `price`: `number` (`numeric(10, 2)`)
    - `type`: `'MARKET'` | `'LIMIT'`
    - `side`: `'BUY'` | `'SELL'` | `'CASH_IN'` | `'CASH_OUT'`
    - `status`: `'NEW'` | `'FILLED'` | `'REJECTED'` | `'CANCELLED'`
    - `datetime`: `Date` (`timestamp`)

---

## 7. Reglas de Negocio (Estrictas)

### A. Cálculo de Tenencias y Pesos Disponibles
- **Fuente de verdad:** Todos los cálculos de tenencia y efectivo disponible se derivan exclusivamente de los registros en la tabla `orders` con estado `FILLED` (utilizando la columna `size`).
- **Pesos Disponibles (ARS):**
    - Sumar movimientos `CASH_IN` (`FILLED`) + ventas `SELL` (`FILLED`, `size * price`).
    - Restar movimientos `CASH_OUT` (`FILLED`) + compras `BUY` (`FILLED`, `size * price`).
    - *Nota:* Considerar también si las órdenes `LIMIT` en estado `NEW` comprometen saldo o tenencia (validar si se bloquean preventivamente o se validan contra el saldo real).
- **Posiciones por Activo:**
    - Cantidad de acciones = `SUM(size)` de órdenes `BUY` (`FILLED`) − `SUM(size)` de órdenes `SELL` (`FILLED`).
    - Solo mostrar activos donde la cantidad neta de acciones sea mayor a 0.

### B. Endpoint: Portfolio (`GET /portfolio/:userId`)
Debe retornar:
1. **Valor total de la cuenta ($ ARS):** Pesos disponibles + suma del valor de mercado de todas las posiciones activas.
2. **Pesos disponibles para operar ($ ARS).**
3. **Listado de activos que posee el usuario:**
    - Información del instrumento (ticker, nombre, etc.).
    - `size`: Cantidad de acciones actuales.
    - `marketValue`: Valor total monetario de la posición (`cantidad_acciones * close` actual en `marketdata`).
    - `totalReturn`: Rendimiento total porcentual (`%`) calculado a partir de las órdenes `FILLED` de ese activo frente a su valor de mercado actual (y/o rendimiento diario usando `close` vs `previousClose` según corresponda en el DTO).

### C. Endpoint: Buscar Activos (`GET /instruments?query=...`)
- Debe buscar instrumentos dentro del mercado filtrando por coincidencias parciales (case-insensitive, `ILIKE`) tanto por **ticker** como por **nombre**.

### D. Endpoint: Enviar Orden al Mercado (`POST /orders`)
- **No simular el motor de matching del mercado.**
- **Moneda:** Todos los precios operan en pesos (ARS).
- **Cálculo de Cantidad (`size`):**
    - El usuario puede enviar `size` (cantidad exacta de acciones) **O** `amount` (monto total de inversión en ARS), pero no ambos/ninguno (validar en DTO).
    - Si envía `amount` (monto en ARS): calcular `size = Math.floor(amount / precio_aplicable)`. **No se admiten fracciones de acciones.** Si `size < 1`, la orden debe ser rechazada (`REJECTED`).
- **Tipos de Orden (`type`):**
    - **`MARKET`**: No requiere que el usuario envíe `price`. Toma automáticamente el último precio `close` de `marketdata`. Si cumple validaciones, se ejecuta inmediatamente con estado `FILLED`.
    - **`LIMIT`**: Requiere obligatoriamente que el usuario envíe `price`. Si cumple validaciones, se guarda con estado `NEW` (queda pendiente, no afecta tenencia ni saldo ejecutado hasta que pase a `FILLED`).
- **Validación de Fondos / Tenencia y Rechazos (`REJECTED`):**
    - **Compra (`BUY`):** Verificar que `size * price <= pesos_disponibles`. Si no alcanza, guardar la orden en la tabla `orders` con estado `REJECTED` (no lanzar error 400 sin persistir; la orden rechazada **debe quedar registrada**).
    - **Venta (`SELL`):** Verificar que `size <= acciones_disponibles_del_activo`. Si no tiene suficientes acciones, guardar la orden en `orders` con estado `REJECTED`.
- **Transferencias (`CASH_IN` / `CASH_OUT`):**
    - Se modelan como órdenes sobre el instrumento `MONEDA` (`ARS`) con `price = 1`.
    - `CASH_OUT` requiere validar que existan pesos disponibles suficientes; de lo contrario, registrar como `REJECTED`.

### E. Cancelación de Órdenes (`PATCH /orders/:id/cancel` o `DELETE /orders/:id`)
- **Únicamente** se pueden cancelar órdenes que se encuentren en estado `NEW`.
- Si la orden tiene estado `FILLED`, `REJECTED` o `CANCELLED`, retornar error HTTP `400 Bad Request` / `409 Conflict` explicando el motivo.
- Al cancelar, actualizar `status` a `CANCELLED`.

---

## 8. Estándares de Desarrollo para el Agente
- **Antes de escribir código:** Revisar las entidades existentes y el esquema de de PostgreSQL para respetar los nombres exactos de columnas (`previousClose`, `marketdata`, `orders`, etc.).
- **Manejo de Errores:** Usar excepciones estándar de NestJS (`NotFoundException`, `BadRequestException`, `UnprocessableEntityException`) con mensajes claros en español o inglés consistente.
- **Pruebas:** Todo cambio en el motor de cálculo de portfolio o reglas de validación de órdenes (`BUY`/`SELL`, `MARKET`/`LIMIT`, cálculo por monto vs cantidad, estado `REJECTED`) debe incluir tests unitarios cubriendo casos borde (saldo insuficiente, monto menor al valor de 1 acción, cancelación de orden ya ejecutada) y tener una cobertura del codigo minima del 80%.