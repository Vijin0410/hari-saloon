import { serviceCategoryApi } from '@/shared/api/modules/serviceApi';
import { CategoryPage } from '@/shared/ui/CategoryPage';

/**
 * 服务项目分类：复用通用 CategoryPage，仅传 api + perm + 文案。
 */
export function ServiceCategoryPage() {
  return (
    <CategoryPage
      title="服务项目分类"
      description="维护剪发/烫发/染发/护理等服务分类，用于服务项目归类。"
      api={serviceCategoryApi}
      addPerm="biz:serviceCategory:add"
      editPerm="biz:serviceCategory:edit"
      deletePerm="biz:serviceCategory:delete"
      emptyTitle="暂无分类"
      emptyDescription="还未配置任何服务项目分类。"
    />
  );
}
