import { Module } from '@nestjs/common';
import { PayinController } from './payin.controller';
import { PayinService } from './payin.service';
import { Payin } from './entities/paiement.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdministrationModule } from 'libs/administration/src/administration.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { FullAuthStrategy } from 'src/full-auth-guard/full-auth.strategy';

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
    JwtModule,
    AdministrationModule,
  ],
  controllers: [PayinController],
  providers: [PayinService, FullAuthStrategy],
  exports: [PayinService],
})
export class PayinModule {}
