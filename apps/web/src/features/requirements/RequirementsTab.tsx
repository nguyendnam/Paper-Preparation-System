import type { RequirementItem, RequirementStatus, RequirementType } from '../../api/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  RequirementStatusBadge,
  RequirementTypeBadge,
  VerificationBadge,
} from '../../components/ui';
import { requirementStatusLabel, requirementTypeLabel, sourceTypeLabel } from '../../lib/format';

export interface RequirementFilters {
  status: RequirementStatus | '';
  type: RequirementType | '';
  q: string;
}

export function RequirementsTab({
  items,
  filters,
  onFiltersChange,
  canManage,
  writable,
  onOpen,
  onCreate,
}: {
  items: RequirementItem[];
  filters: RequirementFilters;
  onFiltersChange: (next: RequirementFilters) => void;
  canManage: boolean;
  writable: boolean;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  const filtered = filters.status !== '' || filters.type !== '' || filters.q !== '';

  return (
    <div>
      <div className="filter-bar">
        <div className="row">
          <input
            className="input"
            type="search"
            placeholder="Tìm trong nội dung yêu cầu…"
            value={filters.q}
            onChange={(e) => onFiltersChange({ ...filters, q: e.target.value })}
            aria-label="Tìm Requirement"
          />
          <select
            className="input"
            value={filters.status}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as RequirementStatus | '' })}
            aria-label="Lọc theo trạng thái"
          >
            <option value="">Mọi trạng thái</option>
            {(Object.keys(requirementStatusLabel) as RequirementStatus[]).map((s) => (
              <option key={s} value={s}>
                {requirementStatusLabel[s]}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={filters.type}
            onChange={(e) => onFiltersChange({ ...filters, type: e.target.value as RequirementType | '' })}
            aria-label="Lọc theo phân loại"
          >
            <option value="">Mọi phân loại</option>
            {(Object.keys(requirementTypeLabel) as RequirementType[]).map((t) => (
              <option key={t} value={t}>
                {requirementTypeLabel[t]}
              </option>
            ))}
          </select>
          {filtered && (
            <Button variant="ghost" size="sm" onClick={() => onFiltersChange({ status: '', type: '', q: '' })}>
              Xóa bộ lọc
            </Button>
          )}
        </div>
        {canManage && writable && (
          <Button variant="primary" icon="plus" onClick={onCreate}>
            Thêm Requirement
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="format-list-checks"
          action={
            canManage && writable && !filtered ? (
              <Button variant="primary" size="sm" onClick={onCreate}>
                + Thêm Requirement đầu tiên
              </Button>
            ) : undefined
          }
        >
          {filtered
            ? 'Không có Requirement nào khớp bộ lọc.'
            : 'Chưa có Requirement. Hãy đọc CFP / Author Guidelines và ghi lại các điều kiện bài báo cần đáp ứng.'}
        </EmptyState>
      ) : (
        <div className="list">
          {items.map((r) => (
            <Card key={r.id} size="sm" hover onClick={() => onOpen(r.id)}>
              <div className="list-row">
                <div className="row-main">
                  <span className="row-title">{r.description}</span>
                  <span className="row-sub">
                    {sourceTypeLabel[r.sourceType]}
                    {r.sourceSection ? ` · ${r.sourceSection}` : ''}
                    {r.condition ? ` · Điều kiện: ${r.condition}` : ''}
                  </span>
                  <div className="row" style={{ marginTop: 8, gap: 6 }}>
                    <span className="small muted">
                      <Icon name="paperclip" size={12} /> {r.evidenceCount} Evidence
                    </span>
                    <span className="small muted">
                      <Icon name="clipboard-text-outline" size={12} /> {r.tasks.length} Task
                    </span>
                    {r.needsEvidence && r.evidenceCount === 0 && r.status !== 'VERIFIED' && r.status !== 'NOT_APPLICABLE' && (
                      <Badge tone="watch" icon="alert-outline">
                        Thiếu Evidence
                      </Badge>
                    )}
                    {r.latestVerification && <VerificationBadge result={r.latestVerification.result} />}
                    {r.copiedFromId && <Badge tone="info">Bản sao – cần rà soát</Badge>}
                  </div>
                </div>
                <div className="row-side">
                  <RequirementTypeBadge type={r.type} />
                  <RequirementStatusBadge status={r.status} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
