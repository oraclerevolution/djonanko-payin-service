import { Module } from '@nestjs/common';
import { PayinController } from './payin.controller';
import { PayinService } from './payin.service';
import { Payin } from './entities/paiement.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdministrationModule } from 'libs/administration/src/administration.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { FullAuthStrategy } from 'src/full-auth-guard/full-auth.strategy';
import { BullModule } from '@nestjs/bull';
import { PayinJobProcessor } from './payin-job-processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payin]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: 'secret',
      signOptions: {
        expiresIn: '30d',
      },
    }),
    BullModule.registerQueue({
      name: 'payin-queue',
    }),
    JwtModule,
    AdministrationModule,
  ],
  controllers: [PayinController],
  providers: [PayinService, FullAuthStrategy, PayinJobProcessor],
  exports: [PayinService],
})
export class PayinModule {}
