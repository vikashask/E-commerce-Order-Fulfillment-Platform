import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { SearchService } from './search.service.js';

@Controller('api/v1')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('search/products')
  search(@Query('q') q?: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.searchService.search(q || '', limit ? parseInt(limit) : 20, offset ? parseInt(offset) : 0);
  }

  @Post('admin/search/index')
  index(@Body() body: { productId: string; name: string; description?: string; categoryId?: string }) {
    return this.searchService.indexProduct(body);
  }

  @Post('admin/search/rebuild')
  rebuild() { return this.searchService.rebuildIndex(); }
}
