import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@ApiTags('Users')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({ description: 'User created successfully' })
  @Post()
  register(@Body() createUserDto: CreateUserDto) {
    return this.userService.registerUser(createUserDto);
  }

  @ApiOperation({ summary: 'Login and receive a JWT' })
  @ApiOkResponse({ description: 'Returns accessToken and user details' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.userService.loginUser(loginDto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users' })
  @ApiOkResponse({ description: 'List of all users (passwords excluded)' })
  @UseGuards(JwtGuard)
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search users by email (partial match)' })
  @ApiQuery({ name: 'email', required: false, example: 'john' })
  @ApiOkResponse({ description: 'Matching users (passwords excluded)' })
  @UseGuards(JwtGuard)
  @Get('search')
  search(@Query('email') email: string) {
    return this.userService.searchByEmail(email ?? '');
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiOkResponse({ description: 'User details (password excluded)' })
  @UseGuards(JwtGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a user' })
  @ApiOkResponse({ description: 'Updated user (password excluded)' })
  @ApiForbiddenResponse({ description: 'Can only update your own account' })
  @UseGuards(JwtGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req: Request) {
    if (req['user'].sub !== id && req['user'].role !== 'admin') {
      throw new ForbiddenException('You can only update your own account');
    }
    return this.userService.update(id, updateUserDto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a user' })
  @ApiOkResponse({ description: 'User deleted successfully' })
  @ApiForbiddenResponse({ description: 'Can only delete your own account' })
  @UseGuards(JwtGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    if (req['user'].sub !== id && req['user'].role !== 'admin') {
      throw new ForbiddenException('You can only delete your own account');
    }
    return this.userService.remove(id);
  }
}
