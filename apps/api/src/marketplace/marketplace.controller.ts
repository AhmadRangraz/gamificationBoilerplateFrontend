import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  SameOriginGuard,
  SessionGuard,
  type AuthRequest,
} from '../auth/auth.guards.js';
import {
  FavoriteState,
  ListingInput,
  ListingPage,
  ListingQuery,
  ListingResponse,
  PageQuery,
} from './listing.dto.js';
import { ListingsService } from './listings.service.js';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly listings: ListingsService) {}

  @Get('listings')
  @ApiOkResponse({ type: ListingPage })
  browseListings(@Query() query: ListingQuery) {
    return this.listings.browse(query);
  }

  @Get('listings/:id')
  @ApiOkResponse({ type: ListingResponse })
  getListing(@Param('id', ParseUUIDPipe) id: string) {
    return this.listings.detail(id);
  }

  @Get('mine')
  @UseGuards(SessionGuard)
  @ApiCookieAuth('session')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: ListingPage })
  getOwnedListings(@Req() request: AuthRequest, @Query() query: PageQuery) {
    return this.listings.owned(request.account.id, query.page);
  }

  @Post('listings')
  @UseGuards(SessionGuard, SameOriginGuard)
  @ApiCookieAuth('session')
  @ApiCreatedResponse({ type: ListingResponse })
  createListing(@Req() request: AuthRequest, @Body() input: ListingInput) {
    return this.listings.create(request.account.id, input);
  }

  @Patch('listings/:id')
  @UseGuards(SessionGuard, SameOriginGuard)
  @ApiCookieAuth('session')
  @ApiOkResponse({ type: ListingResponse })
  updateListing(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ListingInput,
  ) {
    return this.listings.update(request.account.id, id, input);
  }

  @Delete('listings/:id')
  @UseGuards(SessionGuard, SameOriginGuard)
  @ApiCookieAuth('session')
  @HttpCode(204)
  @ApiNoContentResponse()
  deleteListing(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.listings.remove(request.account.id, id);
  }

  @Get('favorites')
  @UseGuards(SessionGuard)
  @ApiCookieAuth('session')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: ListingPage })
  getFavoriteListings(@Req() request: AuthRequest, @Query() query: PageQuery) {
    return this.listings.favorites(request.account.id, query.page);
  }

  @Get('favorites/:id')
  @UseGuards(SessionGuard)
  @ApiCookieAuth('session')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: FavoriteState })
  getFavoriteState(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.listings.isFavorite(request.account.id, id);
  }

  @Put('favorites/:id')
  @UseGuards(SessionGuard, SameOriginGuard)
  @ApiCookieAuth('session')
  @HttpCode(204)
  @ApiNoContentResponse()
  saveFavoriteListing(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.listings.saveFavorite(request.account.id, id);
  }

  @Delete('favorites/:id')
  @UseGuards(SessionGuard, SameOriginGuard)
  @ApiCookieAuth('session')
  @HttpCode(204)
  @ApiNoContentResponse()
  deleteFavoriteListing(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.listings.removeFavorite(request.account.id, id);
  }
}
