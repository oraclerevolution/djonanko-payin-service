import { HttpService } from '@nestjs/axios';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Conf } from '../config/Conf';
import { isUUID } from 'class-validator';
import { UpdateResult } from 'typeorm';

@Injectable()
export class AdministrationService {
  constructor(private readonly httpService: HttpService) {}

  loginToAdmin(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.httpService.axiosRef
        .post(`${Conf.ADMIN_BASE_URL}/user/login`, {
          numero: Conf.ADMIN_USERNAME,
          password: Conf.ADMIN_PASSWORD,
        })
        .then((response) => {
          // console.log('response', response);
          resolve(response.data);
        })
        .catch((error) => {
          reject(new UnauthorizedException(error));
        });
    });
  }

  getUserData(apiKey: string, number: string): Promise<any> {
    if (!isUUID(apiKey)) {
      throw new UnauthorizedException('Invalid Payin service API key');
    }
    return new Promise(async (resolve, reject) => {
      const token = await this.getAccessToken();
      if (!token) {
        new UnauthorizedException('Token dont exists');
      }
      this.httpService.axiosRef
        .get(`${Conf.ADMIN_BASE_URL}/user/user-infos-by-number`, {
          headers: {
            authenticationtoken: `${token}`,
          },
          params: {
            phoneNumber: number,
          },
        })
        .then((res) => {
          resolve(res.data);
        })
        .catch((error) => {
          console.log('======================');
          console.log(error);
          console.log('======================');
          reject(error);
        });
    });
  }

  getUserDataById(apiKey: string, id: number): Promise<any> {
    if (!isUUID(apiKey)) {
      throw new UnauthorizedException('Invalid Payin service API key');
    }
    return new Promise(async (resolve, reject) => {
      const token = await this.getAccessToken();
      if (!token) {
        new UnauthorizedException('Token dont exists');
      }
      this.httpService.axiosRef
        .get(`${Conf.ADMIN_BASE_URL}/user/user-infos-by-id`, {
          headers: {
            authenticationtoken: `${token}`,
          },
          params: {
            id: id,
          },
        })
        .then((res) => {
          resolve(res.data);
        })
        .catch((error) => {
          console.log('======================');
          console.log(error);
          console.log('======================');
          reject(error);
        });
    });
  }

  async getAccessToken(): Promise<string> {
    const response = await this.loginToAdmin();
    // console.log('response', response);
    return response.access_token as string;
  }

  createHistorique(apiKey: string, payload: any) {
    if (!isUUID(apiKey)) {
      throw new UnauthorizedException('Invalid Payin service API key');
    }
    return new Promise(async (resolve, reject) => {
      const token = await this.getAccessToken();
      if (!token) {
        new UnauthorizedException('Token dont exists');
      }
      this.httpService.axiosRef
        .post(`${Conf.ADMIN_BASE_URL}/historiques`, payload, {
          headers: {
            authenticationtoken: `${token}`,
          },
        })
        .then((res) => {
          resolve(res.data);
        })
        .catch((error) => {
          console.log('======================');
          console.log(error);
          console.log('======================');
          reject(error);
        });
    });
  }

  createTransaction(apiKey: string, payload: any) {
    if (!isUUID(apiKey)) {
      throw new UnauthorizedException('Invalid Payin service API key');
    }
    return new Promise(async (resolve, reject) => {
      const token = await this.getAccessToken();
      if (!token) {
        new UnauthorizedException('Token dont exists');
      }
      this.httpService.axiosRef
        .post(`${Conf.TRANSACTIONS_BASE_URL}/transactions`, payload, {
          headers: {
            authenticationtoken: `${token}`,
          },
        })
        .then((res) => {
          resolve(res.data);
        })
        .catch((error) => {
          console.log('======================');
          console.log(error);
          console.log('======================');
          reject(error);
        });
    });
  }

  updateTransaction(apiKey: string, transactionId: string, payload: any) {
    if (!isUUID(apiKey)) {
      throw new UnauthorizedException('Invalid Payin service API key');
    }
    return new Promise(async (resolve, reject) => {
      const token = await this.getAccessToken();
      if (!token) {
        new UnauthorizedException('Token dont exists');
      }
      this.httpService.axiosRef
        .patch(`${Conf.TRANSACTIONS_BASE_URL}/transactions/update`, payload, {
          headers: {
            authenticationtoken: `${token}`,
          },
          params: {
            id: transactionId,
          },
        })
        .then((res) => {
          resolve(res.data);
        })
        .catch((error) => {
          console.log('======================');
          console.log(error);
          console.log('======================');
          reject(error);
        });
    });
  }

  updateUser(
    apiKey: string,
    userId: string,
    payload: any,
  ): Promise<UpdateResult> {
    if (!isUUID(apiKey)) {
      throw new UnauthorizedException('Invalid Payin service API key');
    }
    return new Promise(async (resolve, reject) => {
      const token = await this.getAccessToken();
      if (!token) {
        new UnauthorizedException('Token dont exists');
      }
      this.httpService.axiosRef
        .patch(`${Conf.ADMIN_BASE_URL}/user/update-user`, payload, {
          headers: {
            authenticationtoken: `${token}`,
          },
          params: {
            id: userId,
          },
        })
        .then((res) => {
          resolve(res.data);
        })
        .catch((error) => {
          console.log('======================');
          console.log(error);
          console.log('======================');
          reject(error);
        });
    });
  }

  updateHistorique(
    apiKey: string,
    historiqueId: string,
    payload: any,
  ): Promise<UpdateResult> {
    if (!isUUID(apiKey)) {
      throw new UnauthorizedException('Invalid Payin service API key');
    }
    return new Promise(async (resolve, reject) => {
      const token = await this.getAccessToken();
      if (!token) {
        new UnauthorizedException('Token dont exists');
      }
      this.httpService.axiosRef
        .patch(
          `${Conf.ADMIN_BASE_URL}/historiques/update-historique`,
          payload,
          {
            headers: {
              authenticationtoken: `${token}`,
            },
            params: {
              id: historiqueId,
            },
          },
        )
        .then((res) => {
          resolve(res.data);
        })
        .catch((error) => {
          console.log('======================');
          console.log(error);
          console.log('======================');
          reject(error);
        });
    });
  }

  createCompteCollecte(apiKey: string, payload: any) {
    if (!isUUID(apiKey)) {
      throw new UnauthorizedException('Invalid Payin service API key');
    }
    return new Promise(async (resolve, reject) => {
      const token = await this.getAccessToken();
      if (!token) {
        new UnauthorizedException('Token dont exists');
      }
      this.httpService.axiosRef
        .post(`${Conf.ADMIN_BASE_URL}/compte-collecte`, payload, {
          headers: {
            authenticationtoken: `${token}`,
          },
        })
        .then((res) => {
          resolve(res.data);
        })
        .catch((error) => {
          console.log('======================');
          console.log(error);
          console.log('======================');
          reject(error);
        });
    });
  }

  createCompteReservation(apiKey: string, payload: any) {
    if (!isUUID(apiKey)) {
      throw new UnauthorizedException('Invalid Payin service API key');
    }
    return new Promise(async (resolve, reject) => {
      const token = await this.getAccessToken();
      if (!token) {
        new UnauthorizedException('Token dont exists');
      }
      this.httpService.axiosRef
        .post(`${Conf.ADMIN_BASE_URL}/compte-reservation/create`, payload, {
          headers: {
            authenticationtoken: `${token}`,
          },
        })
        .then((res) => {
          resolve(res.data);
        })
        .catch((error) => {
          console.log('======================');
          console.log(error);
          console.log('======================');
          reject(error);
        });
    });
  }

  updateCompteReservation(
    apiKey: string,
    reservationId: string,
    payload: any,
  ): Promise<UpdateResult> {
    if (!isUUID(apiKey)) {
      throw new UnauthorizedException('Invalid Payin service API key');
    }
    return new Promise(async (resolve, reject) => {
      const token = await this.getAccessToken();
      if (!token) {
        new UnauthorizedException('Token dont exists');
      }
      this.httpService.axiosRef
        .patch(`${Conf.ADMIN_BASE_URL}/compte-reservation/update`, payload, {
          headers: {
            authenticationtoken: `${token}`,
          },
          params: {
            id: reservationId,
          },
        })
        .then((res) => {
          resolve(res.data);
        })
        .catch((error) => {
          console.log('======================');
          console.log(error);
          console.log('======================');
          reject(error);
        });
    });
  }

  userReferralByUserId(apiKey: string, userId: number): Promise<any> {
    if (!isUUID(apiKey)) {
      throw new UnauthorizedException('Invalid Payin service API key');
    }
    return new Promise(async (resolve, reject) => {
      const token = await this.getAccessToken();
      if (!token) {
        new UnauthorizedException('Token dont exists');
      }
      this.httpService.axiosRef
        .get(`${Conf.ADMIN_BASE_URL}/referrals/all-user-referrals`, {
          headers: {
            authenticationtoken: `${token}`,
          },
          params: {
            id: userId,
          },
        })
        .then((res) => {
          resolve(res.data);
        })
        .catch((error) => {
          console.log('======================');
          console.log(error);
          console.log('======================');
          reject(error);
        });
    });
  }

  getUsersPremium(apiKey: string): Promise<any> {
    if (!isUUID(apiKey)) {
      throw new UnauthorizedException('Invalid Payin service API key');
    }
    return new Promise(async (resolve, reject) => {
      const token = await this.getAccessToken();
      if (!token) {
        new UnauthorizedException('Token dont exists');
      }
      this.httpService.axiosRef
        .get(`${Conf.ADMIN_BASE_URL}/user/users-premiums`, {
          headers: {
            authenticationtoken: `${token}`,
          },
        })
        .then((res) => {
          resolve(res.data);
        })
        .catch((error) => {
          console.log('======================');
          console.log(error);
          console.log('======================');
          reject(error);
        });
    });
  }

  changePremiumStatus(apiKey: string): Promise<any> {
    if (!isUUID(apiKey)) {
      throw new UnauthorizedException('Invalid Payin service API key');
    }
    return new Promise(async (resolve, reject) => {
      const token = await this.getAccessToken();
      if (!token) {
        new UnauthorizedException('Token dont exists');
      }
      this.httpService.axiosRef
        .get(`${Conf.ADMIN_BASE_URL}/user/change-premium-status`, {
          headers: {
            authenticationtoken: `${token}`,
          },
        })
        .then((res) => {
          resolve(res.data);
        })
        .catch((error) => {
          console.log('======================');
          console.log(error);
          console.log('======================');
          reject(error);
        });
    });
  }

  getTransactionByReference(apiKey: string, reference: string): Promise<any> {
    if (!isUUID(apiKey)) {
      throw new UnauthorizedException('Invalid Payin service API key');
    }
    return new Promise(async (resolve, reject) => {
      const token = await this.getAccessToken();
      if (!token) {
        new UnauthorizedException('Token dont exists');
      }
      this.httpService.axiosRef
        .get(
          `${Conf.TRANSACTIONS_BASE_URL}/transactions/get-transaction-by-reference`,
          {
            headers: {
              authenticationtoken: `${token}`,
            },
            params: {
              reference: reference,
            },
          },
        )
        .then((res) => {
          resolve(res.data);
        })
        .catch((error) => {
          console.log('======================');
          console.log(error);
          console.log('======================');
          reject(error);
        });
    });
  }

  updateReferral(
    apiKey: string,
    referralId: string,
    payload: any,
  ): Promise<UpdateResult> {
    if (!isUUID(apiKey)) {
      throw new UnauthorizedException('Invalid Payin service API key');
    }
    return new Promise(async (resolve, reject) => {
      const token = await this.getAccessToken();
      if (!token) {
        new UnauthorizedException('Token dont exists');
      }
      this.httpService.axiosRef
        .patch(`${Conf.ADMIN_BASE_URL}/referrals/update`, payload, {
          headers: {
            authenticationtoken: `${token}`,
          },
          params: {
            id: referralId,
          },
        })
        .then((res) => {
          resolve(res.data);
        })
        .catch((error) => {
          console.log('======================');
          console.log(error);
          console.log('======================');
          reject(error);
        });
    });
  }

  sendNotifications(apiKey: string, payload: any) {
    if (!isUUID(apiKey)) {
      throw new UnauthorizedException('Invalid Payin service API key');
    }
    return new Promise(async (resolve, reject) => {
      const token = await this.getAccessToken();
      if (!token) {
        new UnauthorizedException('Token dont exists');
      }
      this.httpService.axiosRef
        .post(
          `${Conf.ADMIN_BASE_URL}/notifications/send-notification`,
          payload,
          {
            headers: {
              authenticationtoken: `${token}`,
            },
          },
        )
        .then((res) => {
          resolve(res.data);
        })
        .catch((error) => {
          console.log('======================');
          console.log(error);
          console.log('======================');
          reject(error);
        });
    });
  }

  getHistoriqueByReference(apiKey: string, reference: string) {
    if (!isUUID(apiKey)) {
      throw new UnauthorizedException('Invalid Payin service API key');
    }
    return new Promise(async (resolve, reject) => {
      const token = await this.getAccessToken();
      if (!token) {
        new UnauthorizedException('Token dont exists');
      }
      this.httpService.axiosRef
        .get(`${Conf.ADMIN_BASE_URL}/historiques/get-historique-by-reference`, {
          headers: {
            authenticationtoken: `${token}`,
          },
          params: {
            reference: reference,
          },
        })
        .then((res) => {
          resolve(res.data);
        })
        .catch((error) => {
          console.log('======================');
          console.log(error);
          console.log('======================');
          reject(error);
        });
    });
  }
}
