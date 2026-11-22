import type { TargetDetail } from '../../api/types';
import { isoToZonedLocal, zonedLocalToIso } from '../../lib/format';

/** Form state for a Submission Target; deadlines are typed in the conference time zone (NFR-08). */
export interface TargetFormState {
  conferenceName: string;
  acronym: string;
  edition: string;
  conferenceYear: string;
  track: string;
  cfpUrl: string;
  authorGuidelinesUrl: string;
  timezone: string;
  abstractDeadline: string;
  fullPaperDeadline: string;
  notificationDate: string;
  deadlineSource: string;
}

export const emptyTargetForm: TargetFormState = {
  conferenceName: '',
  acronym: '',
  edition: '',
  conferenceYear: '',
  track: '',
  cfpUrl: '',
  authorGuidelinesUrl: '',
  timezone: 'UTC',
  abstractDeadline: '',
  fullPaperDeadline: '',
  notificationDate: '',
  deadlineSource: '',
};

type TargetLike = Pick<
  TargetDetail,
  | 'conferenceName'
  | 'acronym'
  | 'edition'
  | 'conferenceYear'
  | 'track'
  | 'cfpUrl'
  | 'authorGuidelinesUrl'
  | 'timezone'
  | 'abstractDeadline'
  | 'fullPaperDeadline'
  | 'notificationDate'
  | 'deadlineSource'
>;

export function targetFormFrom(target: TargetLike): TargetFormState {
  return {
    conferenceName: target.conferenceName,
    acronym: target.acronym ?? '',
    edition: target.edition ?? '',
    conferenceYear: target.conferenceYear ? String(target.conferenceYear) : '',
    track: target.track ?? '',
    cfpUrl: target.cfpUrl ?? '',
    authorGuidelinesUrl: target.authorGuidelinesUrl ?? '',
    timezone: target.timezone,
    abstractDeadline: isoToZonedLocal(target.abstractDeadline, target.timezone),
    fullPaperDeadline: isoToZonedLocal(target.fullPaperDeadline, target.timezone),
    notificationDate: isoToZonedLocal(target.notificationDate, target.timezone),
    deadlineSource: target.deadlineSource ?? '',
  };
}

const orNull = (value: string) => value.trim() || null;

export function targetFormToBody(form: TargetFormState) {
  return {
    conferenceName: form.conferenceName.trim(),
    acronym: orNull(form.acronym),
    edition: orNull(form.edition),
    conferenceYear: form.conferenceYear ? Number(form.conferenceYear) : null,
    track: orNull(form.track),
    cfpUrl: orNull(form.cfpUrl),
    authorGuidelinesUrl: orNull(form.authorGuidelinesUrl),
    timezone: form.timezone,
    abstractDeadline: zonedLocalToIso(form.abstractDeadline, form.timezone),
    fullPaperDeadline: zonedLocalToIso(form.fullPaperDeadline, form.timezone),
    notificationDate: zonedLocalToIso(form.notificationDate, form.timezone),
    deadlineSource: orNull(form.deadlineSource),
  };
}
