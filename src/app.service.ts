import { Injectable } from '@nestjs/common';
import { PSM, createWorker } from 'tesseract.js';

@Injectable()
export class AppService {
  async generate(
    file: Express.Multer.File,
    firstname: string,
    lastname: string,
    chill: number[],
    sunday: boolean,
  ): Promise<any> {
    try {
      const worker = await createWorker('fra');
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        user_defined_dpi: '300',
      });
      const res = await worker.recognize(file.buffer);
      await worker.terminate();

      const output = res.data.text;

      const patterns = {
        name: /([A-Za-zÀ-ÖØ-öø-ÿ'\-]+)\s+([A-Za-zÀ-ÖØ-öø-ÿ'\-]+)/g,
        hours: /\d{1,2}h\d{0,2}/g,
        dates: /du (\d{2})\/(\d{2})\/(\d{4}) au (\d{2})\/(\d{2})\/(\d{4})/,
      };

      const dates = output.match(patterns.dates);
      const start = new Date(`${dates[3]}-${dates[2]}-${dates[1]}`);
      //const end = new Date(`${dates[6]}-${dates[5]}-${dates[4]}`);

      const lines = output.split('\n');
      const result = [];

      for (const line of lines) {
        const name = line.toLowerCase().match(patterns.name);
        const [lastName, firstName] = name ? name[0].split(' ') : [null, null];
        if (
          firstName === firstname.toLowerCase() &&
          lastName === lastname.toLowerCase()
        ) {
          const hours = line.match(patterns.hours);

          if (hours) {
            let i = 0;
            let replace = null;
            for (let day = 1; sunday ? day < 8 : day < 7; day++) {
              const date = new Date(start);

              if (chill.includes(day)) {
                result.push({ date, title: 'Repos 🌤️' });
              } else {
                const startHour = hours[i];
                const endHour = hours[i + 1];

                const startMinutes = _toMinutes(startHour);
                const endMinutes = _toMinutes(endHour);

                if (
                  !replace &&
                  endHour &&
                  startHour &&
                  endMinutes < startMinutes
                ) {
                  result.push({ date, error: true });
                  replace = endHour;
                } else {
                  if (replace) {
                    result.push({
                      date,
                      startHour: replace,
                      endHour: startHour,
                      title: _title(startHour, endHour),
                    });

                    replace = null;
                  } else {
                    if (startHour && endHour)
                      result.push({
                        date,
                        startHour: replace || startHour,
                        endHour,
                        title: _title(replace || startHour, endHour),
                      });
                    else result.push({ date, error: true });
                  }
                }

                i += 2;
              }

              date.setDate(date.getDate() + day - 1);
            }
          }
        }
      }

      return result;
    } catch (error) {
      console.error(error);
      return { error: true };
    }
  }
}

function _toMinutes(hour) {
  if (!hour) return undefined;
  const [hours, minutes] = hour
    .split('h')
    .map((value) => (value ? parseInt(value) : 0));
  return hours * 60 + minutes;
}

function _title(start, end) {
  if (start && start.includes('8h')) return 'Ouverture 🥱';
  if (
    start &&
    (start.includes('10h') || start.includes('10h30') || start.includes('11h'))
  )
    return 'Journée 🌞';
  if (end && end.includes('20h30')) return 'Fermeture 🌙';
  if (end && end.includes('20h')) return 'Fin de journée 🌛';
  return `Travail 💼`;
}
