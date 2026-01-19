import { Controller, Get, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { Prisma } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() data: Prisma.UserCreateInput) {
    return this.usersService.create(data);
  }

  @Post('find-or-create')
  findOrCreate(@Body() data: Prisma.UserCreateInput) {
    return this.usersService.findOrCreate(data);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
