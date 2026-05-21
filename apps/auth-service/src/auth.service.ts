import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { signJwt } from '@ipam/shared-auth';

const DEV_SECRET = 'ipam-dev-secret-change-in-production';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET env var is required in production');
    }
    return DEV_SECRET;
  }
  return secret;
}

@Injectable()
export class AuthService {
  constructor(private dataSource: DataSource) {}

  async getHealth() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'UP', service: 'auth-service' };
    } catch (e) {
      return { status: 'DOWN', error: e.message };
    }
  }

  async login(email: string, password: string) {
    const users = await this.dataSource.query(
      'SELECT * FROM users WHERE email = $1',
      [email],
    );

    if (!users.length) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = users[0];
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const roles = await this.dataSource.query(
      `SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = $1`,
      [user.id],
    );

    const roleNames = roles.map((r: any) => r.name);
    const accessToken = signJwt(
      { sub: user.id, email: user.email, roles: roleNames },
      getJwtSecret(),
    );

    return {
      userId: user.id,
      email: user.email,
      roles: roleNames,
      accessToken,
    };
  }

  async hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, 10);
  }

  async getUsers() {
    return this.dataSource.query(`SELECT id, email, status, created_at FROM users`);
  }
}
