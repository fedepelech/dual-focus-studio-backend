import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  findAllApproved() {
    return this.reviewsService.findAllApproved();
  }

  @Get('check/:token')
  checkToken(@Param('token') token: string) {
    return this.reviewsService.checkToken(token);
  }

  @Post('submit/:token')
  submitReview(
    @Param('token') token: string,
    @Body() data: { rating: number; comment?: string },
  ) {
    return this.reviewsService.submitReview(token, data);
  }

  @Get('admin')
  findAllAdmin() {
    return this.reviewsService.findAllAdmin();
  }

  @Patch(':id/approve')
  toggleApproval(
    @Param('id') id: string,
    @Body('isApproved') isApproved: boolean,
  ) {
    return this.reviewsService.toggleApproval(id, isApproved);
  }
}
