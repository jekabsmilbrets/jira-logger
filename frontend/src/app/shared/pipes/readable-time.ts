import { Pipe, type PipeTransform } from '@angular/core';

@Pipe({
  name: 'readableTime',
  standalone: true,
})
export class ReadableTime implements PipeTransform {
  private static readonly hourInSeconds: number = 3600;
  private static readonly minuteInSeconds: number = 60;

  public transform(
    seconds: number,
    withSeconds: boolean = false,
  ): string {
    if (Number.isNaN(seconds)) {
      return '0s';
    }

    if (seconds < 60) {
      return `${ seconds }s`;
    }

    const units: [number, string][] = [
      [Math.floor(seconds / ReadableTime.hourInSeconds), 'h'],
      [Math.floor((seconds % ReadableTime.hourInSeconds) / ReadableTime.minuteInSeconds), 'm'],
    ];

    if (withSeconds) {
      units.push([
        seconds % ReadableTime.minuteInSeconds,
        's',
      ]);
    }

    return units
      .filter(([value]: [number, string]) => value > 0)
      .map(([value, suffix]: [number, string]) => `${ value }${ suffix }`)
      .join(' ');
  }
}
