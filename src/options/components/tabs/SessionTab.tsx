import { SessionManagement } from '../SessionManagement';

export function SessionTab() {
    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">会话管理</h2>
            <p className="text-base-content/70 mb-6">
                管理所有浏览器扩展会话记录。您可以查看、搜索、重命名、导出和导入会话。
            </p>
            <SessionManagement />
        </div>
    );
}