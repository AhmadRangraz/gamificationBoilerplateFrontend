'use client';

import type { components } from '@forge/api-client';
import { forgeConfig } from '@forge/config';
import { Button, Field, Panel } from '@forge/ui';
import { browserApi } from '../lib/browser-api';
import { presetCopy as copy } from '../lib/preset-copy';
import { usePresetMutation } from './preset-mutation';

const localTime = new Intl.DateTimeFormat(forgeConfig.locale, {
  calendar: 'persian',
  timeZone: forgeConfig.timezone,
  dateStyle: 'medium',
  timeStyle: 'short',
  numberingSystem: forgeConfig.digits === 'persian' ? 'arabext' : 'latn',
});

export function Booking({
  services,
  appointments,
}: components['schemas']['BookingView']) {
  const { save, pending, feedback } = usePresetMutation();
  return (
    <>
      {feedback}
      {!services.length && (
        <Panel>
          <p>{copy.noServices}</p>
        </Panel>
      )}
      {services.map((service) => (
        <Panel key={service.id}>
          <h2>{service.title}</h2>
          <p className="preset-prose">{service.description}</p>
          <p>
            {service.provider} · {copy.halfHour}
          </p>
          {service.slots.length ? (
            <ul className="progress-ledger" role="list">
              {service.slots.map(({ id, startsAt }) => (
                <li key={id}>
                  <time dateTime={startsAt}>
                    {localTime.format(new Date(startsAt))}
                  </time>
                  {!service.mine && (
                    <Button
                      disabled={pending}
                      onClick={() =>
                        save(() =>
                          browserApi().POST(
                            '/api/v1/booking/slots/{id}/reserve',
                            { params: { path: { id } } },
                          ),
                        )
                      }
                    >
                      {copy.reserve}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>{copy.noSlots}</p>
          )}
          {service.mine && (
            <form
              className="ui-form"
              action={(data) => {
                const startsAt = new Date(
                  String(data.get('startsAt') ?? ''),
                ).toISOString();
                return save(() =>
                  browserApi().POST('/api/v1/booking/services/{id}/slots', {
                    params: { path: { id: service.id } },
                    body: { startsAt },
                  }),
                );
              }}
            >
              <Field id={`slot-${service.id}`} label={copy.slot}>
                <input
                  className="ui-input"
                  name="startsAt"
                  id={`slot-${service.id}`}
                  type="datetime-local"
                  required
                />
              </Field>
              <Button type="submit" disabled={pending}>
                {copy.addSlot}
              </Button>
            </form>
          )}
        </Panel>
      ))}
      <Panel>
        <h2>{copy.appointments}</h2>
        {!appointments.length && <p>{copy.noAppointments}</p>}
        <ul className="progress-ledger" role="list">
          {appointments.map(({ id, provider, service, status, startsAt }) => {
            const actions: ('CONFIRMED' | 'COMPLETED' | 'CANCELLED')[] = [];
            if (status === 'REQUESTED' || status === 'CONFIRMED')
              actions.push('CANCELLED');
            if (provider && status === 'REQUESTED') actions.push('CONFIRMED');
            if (provider && status === 'CONFIRMED') actions.push('COMPLETED');
            return (
              <li key={id}>
                <div>
                  <strong>{service}</strong>
                  <time dateTime={startsAt}>
                    {localTime.format(new Date(startsAt))}
                  </time>
                  <p>
                    {provider ? copy.provider : copy.customer} ·{' '}
                    {copy.appointmentStates[status]}
                  </p>
                </div>
                <div className="action-row">
                  {actions.map((next) => (
                    <Button
                      key={next}
                      disabled={pending}
                      onClick={() =>
                        save(() =>
                          browserApi().PUT(
                            '/api/v1/booking/appointments/{id}',
                            {
                              params: { path: { id } },
                              body: { status: next },
                            },
                          ),
                        )
                      }
                    >
                      {copy.appointmentActions[next]}
                    </Button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
      <Panel>
        <h2>{copy.newService}</h2>
        <form
          className="ui-form"
          action={(data) =>
            save(() =>
              browserApi().POST('/api/v1/booking/services', {
                body: {
                  title: String(data.get('title') ?? ''),
                  description: String(data.get('description') ?? ''),
                },
              }),
            )
          }
        >
          <Field id="service-title" label={copy.serviceTitle}>
            <input
              className="ui-input"
              id="service-title"
              name="title"
              maxLength={100}
              required
            />
          </Field>
          <Field id="service-description" label={copy.description}>
            <textarea
              className="ui-input"
              id="service-description"
              name="description"
              maxLength={1000}
              required
            />
          </Field>
          <Button type="submit" disabled={pending}>
            {copy.newService}
          </Button>
        </form>
      </Panel>
    </>
  );
}
