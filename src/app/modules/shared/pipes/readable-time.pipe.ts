import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
        name: 'readableTime',
      })
export class ReadableTimePipe implements PipeTransform {
  public transform(seconds: number, withSeconds: boolean = false): string {
    if (Number.isNaN(seconds)) {
      return '0s';
    }
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const levels = [
      [
        Math.floor(seconds / 31536000),
        'y',
      ], // years
      [
        Math.floor((seconds % 31536000) / 86400),
        'd',
      ], // days
      [
        Math.floor(((seconds % 31536000) % 86400) / 3600),
        'h',
      ], // hours
      [
        Math.floor((((seconds % 31536000) % 86400) % 3600) / 60),
        'm',
      ], // minutes
    ];

    if (withSeconds) {
      levels.push(
        [
          (((seconds % 31536000) % 86400) % 3600) % 60,
          's',
        ],
      ); // seconds
    }

    let output = '';

    for (let i = 0, max = levels.length; i < max; i++) {
      if (levels[i][0] === 0) {
        continue;
      }
      output += ` ${levels[i][0]}${levels[i][1]}`;// ' ' + levels[i][0] + levels[i][1];
    }

    return output.trim();
  }
}
