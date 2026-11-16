import { Controller, Get, Query } from '@nestjs/common';
import { InstrumentResponseDto } from './dto/instrument-response.dto';
import { InstrumentsService } from './instruments.service';
import { SearchQueryPipe } from './pipes/search-query.pipe';

@Controller('instruments')
export class InstrumentsController {
  constructor(private readonly instrumentsService: InstrumentsService) {}

  @Get()
  search(
    @Query('query', SearchQueryPipe) query: string,
  ): Promise<InstrumentResponseDto[]> {
    return this.instrumentsService.search(query);
  }
}
