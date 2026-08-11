import { goodsCategoryApi } from '@/shared/api/modules/goodsApi';
import { CategoryPage } from '@/shared/ui/CategoryPage';

/**
 * 商品分类：复用通用 CategoryPage，仅传 api + perm + 文案。
 */
export function GoodsCategoryPage() {
  return (
    <CategoryPage
      title="商品分类"
      description="维护洗护/造型/染护等商品分类，用于商品归类。"
      api={goodsCategoryApi}
      addPerm="biz:goodsCategory:add"
      editPerm="biz:goodsCategory:edit"
      deletePerm="biz:goodsCategory:delete"
      emptyTitle="暂无分类"
      emptyDescription="还未配置任何商品分类。"
    />
  );
}
