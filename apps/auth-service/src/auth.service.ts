import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

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

    return {
      userId: user.id,
      email: user.email,
      roles: roles.map((r: any) => r.name),
      token: null, // replaced with real JWT in Task 2.2
    };
  }

  async hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, 10);
  }

  async getUsers() {
    return this.dataSource.query(`SELECT id, email, status, created_at FROM users`);
  }
}
