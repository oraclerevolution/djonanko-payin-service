import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Payload } from './interfaces/payload.interface';
import { AdministrationService } from 'libs/administration/src/service/administration.service';

const HEADER_AUTHENTICATION_TOKEN_KEY = 'authenticationtoken';
export const FULL_AUTH_GUARD = 'FULL_AUTH_GUARD';

@Injectable()
export class FullAuthStrategy extends PassportStrategy(
  Strategy,
  FULL_AUTH_GUARD,
) {
  constructor(private readonly administrationService: AdministrationService) {
    super({
      jwtFromRequest: ExtractJwt.fromHeader(HEADER_AUTHENTICATION_TOKEN_KEY),
      ignoreExpiration: false,
      secretOrKey: 'secret',
    });
  }

  async validate(payload: Payload) {
    const user = await this.administrationService.getUserData(
      process.env.API_KEY_PAYIN,
      payload.numero,
    );

    if (!user) {
      throw new UnauthorizedException();
    }
    // delete user.password
    // delete user.salt
    return user;
  }
}
