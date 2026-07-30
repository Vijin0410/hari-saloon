import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

type IconComp = ComponentType<{ className?: string }>;

// ponytail: 用动态 import 加载整个 lucide 图标库到独立 chunk，首屏不打包；
// 升级路径：若需更小 bundle，可改为显式 import 精选图标子集。
const COMMON_ICONS = [
  'LayoutDashboard', 'Home', 'Settings', 'Settings2', 'Sliders', 'Users', 'User', 'UserRound', 'UserCog', 'UserPlus',
  'ShieldCheck', 'Shield', 'Lock', 'Key', 'LockKeyhole', 'MenuSquare', 'BookOpen', 'Book', 'FolderTree', 'Folder',
  'FolderOpen', 'File', 'FileText', 'Files', 'List', 'TreePine', 'LayoutGrid', 'Building2', 'Building', 'Store',
  'ShoppingBag', 'ShoppingCart', 'Package', 'Box', 'Gift', 'Coupon', 'Ticket', 'CreditCard', 'Wallet', 'DollarSign',
  'Receipt', 'Tag', 'Tags', 'Star', 'Heart', 'Bell', 'Mail', 'MessageSquare', 'MessageCircle', 'Phone', 'Calendar',
  'Clock', 'MapPin', 'Navigation', 'Compass', 'Globe', 'Server', 'Database', 'HardDrive', 'Cloud', 'Image',
  'Camera', 'Video', 'Music', 'Play', 'Pause', 'Activity', 'TrendingUp', 'BarChart3', 'PieChart', 'Report',
  'Download', 'Upload', 'CloudUpload', 'Filter', 'Search', 'Eye', 'EyeOff', 'Plus', 'Pencil', 'Trash2',
  'Save', 'Copy', 'Clipboard', 'ClipboardList', 'Link', 'ExternalLink', 'Share', 'Send', 'RefreshCw', 'RotateCw',
  'Check', 'X', 'CheckCircle', 'XCircle', 'AlertCircle', 'Info', 'HelpCircle', 'Lightbulb', 'Zap', 'Power',
  'ToggleLeft', 'ToggleRight', 'LogIn', 'LogOut', 'Scissors', 'Sparkles', 'Award', 'Crown', 'Gem', 'Sun', 'Moon',
  'ChevronDown', 'ChevronRight', 'ChevronUp', 'ChevronLeft', 'MoreHorizontal', 'MoreVertical', 'Layers', 'Flag', 'Bookmark',
] as const;

interface IconPickerProps {
  value?: string;
  onChange: (name: string) => void;
  placeholder?: string;
}

/**
 * 图标选择器：按钮触发下拉网格，按名搜索 lucide 图标并点选。
 * 图标库按需动态加载，避免首屏打包全量图标。
 */
export function IconPicker({ value, onChange, placeholder }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [icons, setIcons] = useState<Record<string, IconComp>>({});
  const ref = useRef<HTMLDivElement>(null);

  // 打开或已有值时按需加载图标库（独立 chunk）
  useEffect(() => {
    if (Object.keys(icons).length) {
      return;
    }
    if (!open && !value) {
      return;
    }
    let active = true;
    void import('lucide-react').then((mod) => {
      if (active) {
        setIcons(mod as unknown as Record<string, IconComp>);
      }
    });
    return () => {
      active = false;
    };
  }, [open, value, icons]);

  // 点击外部关闭下拉
  useEffect(() => {
    if (!open) {
      return;
    }
    function handleOutside(event: MouseEvent): void {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return COMMON_ICONS.filter((name) => !kw || name.toLowerCase().includes(kw));
  }, [keyword]);

  const CurrentIcon = value ? icons[value] : undefined;

  function handlePick(name: string): void {
    onChange(name);
    setOpen(false);
    setKeyword('');
  }

  return (
    <div ref={ref} className="relative">
      <button
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-salon-line bg-white px-3 text-sm text-zinc-700 transition hover:border-salon-accent/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="flex items-center gap-2">
          {CurrentIcon ? <CurrentIcon className="size-4 text-salon-accent" /> : null}
          <span className={cn(!value && 'text-zinc-400')}>{value || placeholder || '选择图标'}</span>
        </span>
        <ChevronDown className={cn('size-4 text-zinc-400 transition', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-salon-line bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="relative border-b border-salon-line p-2 dark:border-zinc-800">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              className="w-full rounded-md border border-salon-line bg-slate-50 py-1.5 pl-9 pr-3 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-800"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索图标名"
              value={keyword}
            />
          </div>
          <div className="grid max-h-60 grid-cols-6 gap-1 overflow-y-auto p-2">
            {filtered.map((name) => {
              const Icon = icons[name];
              if (!Icon) {
                return null;
              }
              return (
                <button
                  className={cn(
                    'flex aspect-square items-center justify-center rounded text-zinc-600 transition hover:bg-salon-accent/10 hover:text-salon-accent dark:text-zinc-300',
                    name === value && 'bg-salon-accent/10 text-salon-accent',
                  )}
                  key={name}
                  onClick={() => handlePick(name)}
                  title={name}
                  type="button"
                >
                  <Icon className="size-5" />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
