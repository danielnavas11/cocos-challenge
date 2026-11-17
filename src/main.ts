import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const handleCrash = async (error: unknown, origin: string) => {
    console.error(`Fatal crash detected (${origin}):`, error);
    try {
      await app.close();
    } catch (closeError) {
      console.error('Error during emergency shutdown:', closeError);
    } finally {
      process.exit(1);
    }
  };

  process.on(
    'uncaughtException',
    (err) => void handleCrash(err, 'uncaughtException'),
  );
  process.on(
    'unhandledRejection',
    (reason) => void handleCrash(reason, 'unhandledRejection'),
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
