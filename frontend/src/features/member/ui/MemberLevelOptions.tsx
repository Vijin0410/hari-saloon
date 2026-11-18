import type { MemberLevelOption } from '../model/memberTypes';

/** 会员表单、查询下拉共用分组选项，活动等级保持手动可选且独立归类。 */
interface MemberLevelOptionsProps {
  options: MemberLevelOption[];
}
export function MemberLevelOptions({ options }: MemberLevelOptionsProps) {
  return (
    <>
      {[
        { type: 'REGULAR', name: '常规会员等级' },
        { type: 'ACTIVITY', name: '活动会员等级' },
      ].map((group) => {
        const levels = options.filter((level) => (level.levelType ?? 'REGULAR') === group.type);
        return levels.length ? (
          <optgroup key={group.type} label={group.name}>
            {levels.map((level) => <option key={level.id} value={String(level.id)}>{level.name}</option>)}
          </optgroup>
        ) : null;
      })}
    </>
  );
}
