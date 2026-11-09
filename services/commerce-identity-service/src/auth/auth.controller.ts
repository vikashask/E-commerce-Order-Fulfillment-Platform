import { Controller, Post, Get, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: { email: string; password: string; displayName: string }) {
    if (!body.email || !body.password || !body.displayName) {
      throw new UnauthorizedException('email, password, and displayName are required');
    }
    const user = await this.authService.register(body.email, body.password, body.displayName);
    const loginResult = await this.authService.login(body.email, body.password);
    return loginResult;
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    if (!body.email || !body.password) throw new UnauthorizedException('email and password are required');
    return this.authService.login(body.email, body.password);
  }

  @Get('me')
  async me(@Headers('authorization') auth?: string) {
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('Missing token');
    const payload = this.authService.verifyToken(auth.slice(7));
    const user = await this.authService.getUserById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');
    return { id: user.id, email: user.email, displayName: user.display_name, roles: user.roles || [] };
  }
}
