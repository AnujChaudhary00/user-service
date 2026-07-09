import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './models/user.interface';
import { UserRepository } from './repository/user.repository';

const SALT_ROUNDS = 10;

type SafeUser = Omit<User, 'password'>;

function stripPassword(user: User): SafeUser {
  const { password: _pw, ...safe } = user;
  return safe;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async loginUser(loginDto: LoginDto) {
    const user = await this.userRepository.findByEmail(loginDto.email);
    if (!user) {
      this.logger.warn(`Failed login attempt for email: ${loginDto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    const isValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isValid) {
      this.logger.warn(`Failed login attempt for email: ${loginDto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    this.logger.log(`User ${user.id} logged in`);
    const payload = { sub: user.id, email: user.email, role: user.role ?? 'user' };
    const accessToken = await this.jwtService.signAsync(payload);
    return { accessToken, user: stripPassword(user) };
  }

  async registerUser(createUserDto: CreateUserDto) {
    const existing = await this.userRepository.findByEmail(createUserDto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const hashed = await bcrypt.hash(createUserDto.password, SALT_ROUNDS);
    const user: User = {
      ...createUserDto,
      id: crypto.randomUUID(),
      password: hashed,
      role: createUserDto.role ?? 'user',
      createdAt: new Date().toISOString(),
    };
    await this.userRepository.create(user);
    this.logger.log(`User ${user.id} registered`);
    return { message: 'User created', user: stripPassword(user) };
  }

  async findAll(): Promise<SafeUser[]> {
    const users = await this.userRepository.findAll();
    return users.map(stripPassword);
  }

  async findOne(id: string): Promise<SafeUser> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return stripPassword(user);
  }

  async searchByEmail(query: string): Promise<SafeUser[]> {
    const users = await this.userRepository.searchByEmail(query);
    return users.map(stripPassword);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<SafeUser> {
    const exists = await this.userRepository.findById(id);
    if (!exists) throw new NotFoundException(`User ${id} not found`);

    const updates: Partial<Omit<User, 'id' | 'role'>> = {};
    if (updateUserDto.name) updates.name = updateUserDto.name;
    if (updateUserDto.email) updates.email = updateUserDto.email;
    if (updateUserDto.phone) updates.phone = updateUserDto.phone;
    if (updateUserDto.password) {
      updates.password = await bcrypt.hash(updateUserDto.password, SALT_ROUNDS);
    }
    updates.updatedAt = new Date().toISOString();

    const updated = await this.userRepository.update(id, updates);
    this.logger.log(`User ${id} updated`);
    return stripPassword(updated!);
  }

  async remove(id: string): Promise<{ message: string }> {
    const exists = await this.userRepository.findById(id);
    if (!exists) throw new NotFoundException(`User ${id} not found`);
    await this.userRepository.remove(id);
    this.logger.log(`User ${id} deleted`);
    return { message: 'User deleted' };
  }
}
