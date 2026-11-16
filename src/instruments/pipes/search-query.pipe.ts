import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class SearchQueryPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (typeof value !== 'string') {
      throw new BadRequestException('El parámetro query es obligatorio');
    }

    const query = value.trim();
    if (!query) {
      throw new BadRequestException('El parámetro query no puede estar vacío');
    }
    if (query.length > 255) {
      throw new BadRequestException(
        'El parámetro query no puede superar los 255 caracteres',
      );
    }

    return query;
  }
}
