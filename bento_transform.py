import re

with open('src/components/AdminConsoleModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Change the main container
content = content.replace(
    '<div className="flex-1 overflow-y-auto p-5 space-y-4">',
    '<div className="flex-1 overflow-y-auto p-5"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 auto-rows-max">'
)
# Close the new grid div
content = content.replace(
    '</>\n          )}\n        </div>',
    '</>\n          )}\n        </div></div>'
)

# Replace <section> with bento grid items
# Section 1: Việc đang chờ
content = content.replace(
    '<section>\n                <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">\n                  <Inbox className="w-3.5 h-3.5" />\n                  Việc đang chờ\n                </h3>',
    '<section className="lg:col-span-5 rounded-2xl bg-[#111827] border border-white/5 p-4 flex flex-col justify-between hover:border-white/10 transition-colors">\n                <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-3">\n                  <Inbox className="w-3.5 h-3.5" />\n                  Việc đang chờ\n                </h3>'
)

# Section 2: Sức khoẻ diễn đàn
content = content.replace(
    '<section>\n                <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">\n                  <MessageSquare className="w-3.5 h-3.5" />\n                  Sức khoẻ diễn đàn\n                </h3>',
    '<section className="lg:col-span-7 rounded-2xl bg-[#111827] border border-white/5 p-4 flex flex-col justify-between hover:border-white/10 transition-colors">\n                <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-3">\n                  <MessageSquare className="w-3.5 h-3.5" />\n                  Sức khoẻ diễn đàn\n                </h3>'
)

# Section 3: Quản lý thành viên
content = content.replace(
    '<section className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/[0.07] to-transparent p-4 space-y-3">',
    '<section className="lg:col-span-12 rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/[0.07] to-[#111827] p-5 space-y-4 hover:border-cyan-400/30 transition-all shadow-[inset_0_0_40px_rgba(6,182,212,0.03)]">'
)

# Section 4: CỘNG ĐỒNG + KẾT NỐI (was a grid of 2) -> Let's split them or keep them together as lg:col-span-12
content = content.replace(
    '<section className="grid grid-cols-1 lg:grid-cols-2 gap-4">',
    '<section className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-4">'
)
# Modify their inner divs to be bento cards
content = content.replace(
    '<div>\n                  <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">\n                    <Users className="w-3.5 h-3.5" />\n                    Cộng đồng\n                  </h3>',
    '<div className="rounded-2xl bg-[#111827] border border-white/5 p-4 hover:border-white/10 transition-colors">\n                  <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-3">\n                    <Users className="w-3.5 h-3.5" />\n                    Cộng đồng\n                  </h3>'
)
content = content.replace(
    '<div>\n                  <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">\n                    <Database className="w-3.5 h-3.5" />\n                    Máy chủ & dữ liệu\n                  </h3>',
    '<div className="rounded-2xl bg-[#111827] border border-white/5 p-4 hover:border-white/10 transition-colors">\n                  <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-3">\n                    <Database className="w-3.5 h-3.5" />\n                    Máy chủ & dữ liệu\n                  </h3>'
)

# Section 5: Giới hạn tần suất
content = content.replace(
    '<section>\n                <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">\n                  <Gauge className="w-3.5 h-3.5" />\n                  Giới hạn tần suất',
    '<section className="lg:col-span-12 rounded-2xl bg-[#111827] border border-white/5 p-4 hover:border-white/10 transition-colors">\n                <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-3">\n                  <Gauge className="w-3.5 h-3.5" />\n                  Giới hạn tần suất'
)

# Section 6: Bị tố cáo nhiều nhất
content = content.replace(
    '<section>\n                  <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">\n                    <Radio className="w-3.5 h-3.5" />\n                    Bị tố cáo nhiều nhất\n                  </h3>',
    '<section className="lg:col-span-4 rounded-2xl bg-[#111827] border border-white/5 p-4 hover:border-white/10 transition-colors">\n                  <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-3">\n                    <Radio className="w-3.5 h-3.5" />\n                    Bị tố cáo nhiều nhất\n                  </h3>'
)

# Section 7: Nhật ký quản trị
content = content.replace(
    '<section>\n                <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">\n                  <ScrollText className="w-3.5 h-3.5" />\n                  Nhật ký quản trị',
    '<section className="lg:col-span-8 rounded-2xl bg-[#111827] border border-white/5 p-4 hover:border-white/10 transition-colors">\n                <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-3">\n                  <ScrollText className="w-3.5 h-3.5" />\n                  Nhật ký quản trị'
)

# Section 8: Kho nội dung
content = content.replace(
    '<section>\n                <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">\n                  <Database className="w-3.5 h-3.5" />\n                  Kho nội dung\n                </h3>',
    '<section className="lg:col-span-12 rounded-2xl bg-[#111827] border border-white/5 p-4 hover:border-white/10 transition-colors">\n                <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-3">\n                  <Database className="w-3.5 h-3.5" />\n                  Kho nội dung\n                </h3>'
)

# Role Management addition
# We'll inject a role select next to the ban/mute buttons in the Quản lý thành viên section.
role_ui = """
                            {user.role !== 'SUPER_ADMIN' && (
                              <button
                                type="button"
                                onClick={() => void runModeration(user.email, user.role === 'CLUB_LEADER' ? 'demote' : 'promote' as any)}
                                disabled={busy}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/15 border border-blue-400/25 text-[10px] font-semibold text-blue-300 hover:bg-blue-500/25 disabled:opacity-50 cursor-pointer"
                                title={user.role === 'CLUB_LEADER' ? "Giáng cấp thành Học sinh" : "Thăng cấp thành Chủ nhiệm CLB"}
                              >
                                {user.role === 'CLUB_LEADER' ? 'Demote' : 'Promote'}
                              </button>
                            )}
"""
content = content.replace(
    '<div className="flex items-center gap-1.5 sm:shrink-0">',
    '<div className="flex items-center gap-1.5 sm:shrink-0">' + role_ui
)

with open('src/components/AdminConsoleModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
