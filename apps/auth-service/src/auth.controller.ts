import { Controller, Get, Post, Body } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @SkipThrottle()
  @Get('health')
  async health() {
    return this.service.getHealth();
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.service.login(body.email, body.password);
  }

  @SkipThrottle()
  @Get('users')
  async getUsers() {
    return this.service.getUsers();
  }
}
