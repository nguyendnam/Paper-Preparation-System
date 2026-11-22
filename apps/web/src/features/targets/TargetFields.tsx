import { Field } from '../../components/ui';
import { timezoneOptions } from '../../lib/format';
import type { TargetFormState } from './targetForm';

export function TargetFields({
  value,
  onChange,
}: {
  value: TargetFormState;
  onChange: (next: TargetFormState) => void;
}) {
  const set = <K extends keyof TargetFormState>(key: K, v: TargetFormState[K]) => onChange({ ...value, [key]: v });

  const knownZone = timezoneOptions.some((o) => o.value === value.timezone);

  return (
    <div className="form-grid">
      <Field label="Tên hội nghị" required full>
        {(id) => (
          <input
            id={id}
            className="input"
            value={value.conferenceName}
            onChange={(e) => set('conferenceName', e.target.value)}
            required
          />
        )}
      </Field>

      <Field label="Tên viết tắt">
        {(id) => (
          <input id={id} className="input" value={value.acronym} onChange={(e) => set('acronym', e.target.value)} />
        )}
      </Field>

      <Field label="Năm tổ chức">
        {(id) => (
          <input
            id={id}
            className="input"
            type="number"
            min={1990}
            max={2100}
            value={value.conferenceYear}
            onChange={(e) => set('conferenceYear', e.target.value)}
          />
        )}
      </Field>

      <Field label="Kỳ tổ chức (edition)">
        {(id) => (
          <input id={id} className="input" value={value.edition} onChange={(e) => set('edition', e.target.value)} />
        )}
      </Field>

      <Field label="Track / loại bài gửi">
        {(id) => (
          <input id={id} className="input" value={value.track} onChange={(e) => set('track', e.target.value)} />
        )}
      </Field>

      <Field label="URL CFP">
        {(id) => (
          <input
            id={id}
            className="input"
            type="url"
            placeholder="https://"
            value={value.cfpUrl}
            onChange={(e) => set('cfpUrl', e.target.value)}
          />
        )}
      </Field>

      <Field label="URL Author Guidelines">
        {(id) => (
          <input
            id={id}
            className="input"
            type="url"
            placeholder="https://"
            value={value.authorGuidelinesUrl}
            onChange={(e) => set('authorGuidelinesUrl', e.target.value)}
          />
        )}
      </Field>

      <Field label="Múi giờ của deadline" hint="Nhập deadline theo múi giờ mà hội nghị công bố.">
        {(id) => (
          <select id={id} className="input" value={value.timezone} onChange={(e) => set('timezone', e.target.value)}>
            {!knownZone && <option value={value.timezone}>{value.timezone}</option>}
            {timezoneOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Nguồn thông tin deadline" hint="URL hoặc tên tài liệu chính thức; cập nhật khi hội nghị đổi lịch.">
        {(id) => (
          <input
            id={id}
            className="input"
            value={value.deadlineSource}
            onChange={(e) => set('deadlineSource', e.target.value)}
          />
        )}
      </Field>

      <Field label="Deadline abstract">
        {(id) => (
          <input
            id={id}
            className="input"
            type="datetime-local"
            value={value.abstractDeadline}
            onChange={(e) => set('abstractDeadline', e.target.value)}
          />
        )}
      </Field>

      <Field label="Deadline full paper">
        {(id) => (
          <input
            id={id}
            className="input"
            type="datetime-local"
            value={value.fullPaperDeadline}
            onChange={(e) => set('fullPaperDeadline', e.target.value)}
          />
        )}
      </Field>

      <Field label="Ngày thông báo kết quả">
        {(id) => (
          <input
            id={id}
            className="input"
            type="datetime-local"
            value={value.notificationDate}
            onChange={(e) => set('notificationDate', e.target.value)}
          />
        )}
      </Field>
    </div>
  );
}
