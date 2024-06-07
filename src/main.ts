import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const PORT = 3004;
  const config = new DocumentBuilder()
    .setTitle('Djonanko Payin Service')
    .setDescription('Djonanko Payin API description')
    .setVersion('1.0')
    .addTag('djonanko-payin-service')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(PORT, () => {
    console.log(`Application is running on: ${PORT}`);
  });
}
bootstrap();
