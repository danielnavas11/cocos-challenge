const configuration = () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: Number.parseInt(process.env.PORT ?? '', 10) || 3000,
  database: {
    host: process.env.USE_LOCAL_BD ? 'postgres' : process.env.DATABASE_HOST,
    port: Number.parseInt(process.env.DATABASE_PORT ?? '', 10) || 5432,
    username: process.env.DATABASE_USERNAME ?? 'postgres',
    password: process.env.DATABASE_PASSWORD ?? 'postgres',
    name: process.env.DATABASE_NAME ?? 'test',
    schema: process.env.DATABASE_SCHEMA ?? 'public',
    logging: process.env.SHOW_SQL === 'true',
  },
});
export default configuration;
