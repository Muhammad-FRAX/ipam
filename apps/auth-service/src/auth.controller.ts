import { Controller, Get, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Get('health')
  async health() {
    return this.service.getHealth();
  }

  @Post('login')
  async login(@Body() body: { email: string; passwordHash: string }) {
    return this.service.login(body.email, body.passwordHash);
  }

  @Get('users')
  async getUsers() {
    return this.service.getUsers();
  }
}
