import { Injectable } from '@nestjs/common';
import { createWorker } from 'tesseract.js';

const patterns = {
  name: /([A-Za-zÀ-ÖØ-öø-ÿ'\-]+)\s+([A-Za-zÀ-ÖØ-öø-ÿ'\-]+)/g,
  hours: /\d{1,2}h\d{0,2}/g,
  dates: /du (\d{2})\/(\d{2})\/(\d{4}) au (\d{2})\/(\d{2})\/(\d{4})/,
};

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

      const res = await worker.recognize(file.buffer);
      await worker.terminate();

      const output = res.data.text;

      const dates = output.match(patterns.dates);
      const start = new Date(`${dates[3]}-${dates[2]}-${dates[1]}`);
      //const end = new Date(`${dates[6]}-${dates[5]}-${dates[4]}`);

      const lines = output.split('\n');
      const result = [];

      for (const line of lines) {
        const name = line.toLowerCase().match(patterns.name);
        const [lastName, firstName] = name ? name[0].split(' ') : [null, null];
        if (
          firstName?.includes(firstname.toLowerCase()) &&
          lastName?.includes(lastname.toLowerCase())
        ) {
          const hours = line.match(patterns.hours);

          if (hours) {
            let i = 0;
            let replace = null;
            for (let day = 1; sunday ? day < 8 : day < 7; day++) {
              const date = new Date(start);

              if (chill.includes(day)) {
                result.push({ date, day, title: 'Repos 🌤️' });
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
                  result.push({ date, day, error: true });
                  replace = endHour;
                } else {
                  if (replace && startHour) {
                    const daily = new Date(date);
                    const updated = new Date(
                      daily.setDate(daily.getDate() + day - 1),
                    );
                    result.push({
                      date,
                      day,
                      notes: notes(output, replace, startHour, lastName, i),
                      start: times(updated, replace),
                      end: times(updated, startHour),
                      title: _title(replace, startHour),
                    });

                    replace = null;
                  } else {
                    const daily = new Date(date);
                    const updated = new Date(
                      daily.setDate(daily.getDate() + day - 1),
                    );
                    if (startHour && endHour)
                      result.push({
                        date,
                        day,
                        notes: notes(
                          output,
                          replace || startHour,
                          endHour,
                          lastName,
                          i,
                        ),
                        start: times(updated, replace || startHour),
                        end: times(updated, endHour),
                        title: _title(replace || startHour, endHour),
                      });
                    else result.push({ date, day, error: true });
                  }
                }

                i += 2;
              }

              date.setDate(date.getDate() + day - 1);
            }
          }
        }
      }

      return { result };
    } catch (error) {
      console.error(error);
      return { error: true };
    }
  }
}

function notes(output, startHour, endHour, lastName, i) {
  let note = '';

  if (startHour === '8h') {
    const users = _extract(output, startHour, endHour, lastName, i);
    note = `Ouverture avec : ${users.map((user) => `${user.firstName} ${user.lastName}`).join(', ')}`;
  }

  if (endHour === '20h30') {
    const users = _extract(output, startHour, endHour, lastName, i);
    note = `Fermeture avec : ${users.map((user) => `${user.firstName} ${user.lastName}`).join(', ')}`;
  }

  return note;
}

function times(date, time) {
  const [hour, minutes] = time.split(/h|:/);
  date.setHours(parseInt(hour, 10));
  date.setMinutes(minutes ? parseInt(minutes, 10) : 0);
  return date.toISOString();
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

function _extract(text, yourStartHour, yourEndHour, lastname, index) {
  const shifts = [];
  const lines = text.split('\n');

  lines.forEach((line) => {
    const name = line.toLowerCase().match(patterns.name);
    const [lastName, firstName] = name ? name[0].split(' ') : [null, null];

    const hoursMatches = line.match(patterns.hours);
    if (
      hoursMatches &&
      (hoursMatches[index] === yourStartHour ||
        hoursMatches[index + 1] === yourEndHour) &&
      lastName &&
      firstName &&
      !lastName.includes(lastname)
    ) {
      shifts.push({
        firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
        lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
      });
    }
  });

  return shifts;
}
