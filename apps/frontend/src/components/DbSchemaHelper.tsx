import { Check, Copy, Database, Maximize2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

interface ColumnInfo {
  name: string
  type: string
  description: string
  example: string
}

interface TableInfo {
  id: string
  name: string
  tableName: string
  imageSrc: string
  description: string
  columns: ColumnInfo[]
}

const dbTables: TableInfo[] = [
  {
    id: 'xs',
    name: '学生表',
    tableName: 'xs',
    imageSrc: '/db-xs.png',
    description: '存储学生的基本个人信息，包括学号、姓名、性别、专业及学分情况等。',
    columns: [
      { name: 'XH', type: 'char(6)', description: '学号 (主键)', example: '081101' },
      { name: 'XM', type: 'char(8)', description: '姓名', example: '王林' },
      { name: 'XB', type: 'bit(1) / char(2)', description: '性别', example: '男' },
      { name: 'CSSJ', type: 'date', description: '出生时间', example: '1990-02-10' },
      { name: 'ZY', type: 'char(12)', description: '专业', example: '计算机' },
      { name: 'ZXS', type: 'int', description: '总学分', example: '50' },
      { name: 'BZ', type: 'text', description: '备注', example: 'NULL' },
    ],
  },
  {
    id: 'kc',
    name: '课程表',
    tableName: 'kc',
    imageSrc: '/db-kc.png',
    description: '存储所有课程的基本信息，包括课程编号、课程名、学时和学分。',
    columns: [
      { name: 'KCH', type: 'char(3)', description: '课程号 (主键)', example: '101' },
      { name: 'KCM', type: 'char(16)', description: '课程名', example: '计算机基础' },
      { name: 'KCSH', type: 'int', description: '课时', example: '80' },
      { name: 'XF', type: 'int', description: '学分', example: '5' },
    ],
  },
  {
    id: 'xs_kc',
    name: '成绩表',
    tableName: 'xs_kc',
    imageSrc: '/db-xs_kc.png',
    description: '学生选课成绩关联表，将学生与课程进行多对多映射，并记录对应的成绩。',
    columns: [
      { name: 'XH', type: 'char(6)', description: '学号 (主外键)', example: '081101' },
      { name: 'KCH', type: 'char(3)', description: '课程号 (主外键)', example: '101' },
      { name: 'CJ', type: 'int', description: '成绩', example: '86' },
    ],
  },
]

export default function DbSchemaHelper() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('xs')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)

  const activeTable = dbTables.find(t => t.id === activeTab) || dbTables[0]

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(text)
    setTimeout(() => {
      setCopiedField(null)
    }, 1500)
  }

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.08, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-20 z-40 flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 border border-teal-500/20 backdrop-blur-md cursor-pointer group"
      >
        <Database className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
        <span className="text-sm font-semibold tracking-wide">数据库表结构</span>
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
        </span>
      </motion.button>

      {/* Drawer Overlay & Sidebar Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity"
            />

            {/* Sliding Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[480px] md:w-[560px] lg:w-[640px] bg-slate-50 border-l border-slate-200 shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-50 rounded-lg text-teal-600 border border-teal-100">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      数据库表结构参考
                    </h2>
                    <p className="text-xs text-slate-500">
                      所有 SQL 题目均基于以下三张表的数据和结构
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="px-6 py-3 bg-white border-b border-slate-100 flex gap-2 overflow-x-auto scrollbar-none">
                {dbTables.map(table => (
                  <button
                    type="button"
                    key={table.id}
                    onClick={() => setActiveTab(table.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex-shrink-0 cursor-pointer ${
                      activeTab === table.id
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    {table.name}
                    {' '}
                    <span className="opacity-70 text-xs font-mono font-normal">
                      (
                      {table.tableName}
                      )
                    </span>
                  </button>
                ))}
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Table Introduction */}
                <div className="bg-gradient-to-r from-teal-50/50 to-emerald-50/30 p-4 rounded-xl border border-teal-100/50">
                  <h3 className="text-sm font-bold text-teal-800 flex items-center gap-1.5 mb-1">
                    表用途说明
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {activeTable.description}
                  </p>
                </div>

                {/* Table Image Visualizer */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs relative group/img">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      表数据样例截图 (可放大查看)
                    </span>
                    <button
                      type="button"
                      onClick={() => setFullscreenImage(activeTable.imageSrc)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-700 transition cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" />
                      全屏查看
                    </button>
                  </div>

                  <div className="relative overflow-hidden rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center p-2 min-h-[140px]">
                    <img
                      src={activeTable.imageSrc}
                      alt={activeTable.name}
                      className="max-h-[220px] object-contain transition-transform duration-300 group-hover/img:scale-[1.01]"
                    />
                    <div
                      onClick={() => setFullscreenImage(activeTable.imageSrc)}
                      className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center cursor-zoom-in"
                    >
                      <div className="bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 shadow-md flex items-center gap-1">
                        <Maximize2 className="w-3.5 h-3.5" />
                        点击放大图片
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fields Table Schema */}
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      字段结构与释义
                    </h3>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {activeTable.columns.map(col => (
                      <div
                        key={col.name}
                        className="p-4 flex items-start sm:items-center justify-between hover:bg-slate-50/60 transition-colors group/row"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1">
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {col.name}
                            </code>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.25 rounded">
                              {col.type}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600">
                            {col.description}
                          </div>
                          {col.example && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <span className="font-semibold text-slate-300">例:</span>
                              <code className="font-mono text-slate-500 bg-slate-50/80 px-1 rounded">{col.example}</code>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopy(col.name)}
                          className={`p-1.5 rounded-lg border transition-all duration-200 cursor-pointer flex-shrink-0 ${
                            copiedField === col.name
                              ? 'bg-green-50 border-green-200 text-green-600'
                              : 'bg-white border-slate-200 text-slate-400 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50/20'
                          }`}
                          title="复制字段名"
                        >
                          {copiedField === col.name
                            ? (
                                <Check className="w-3.5 h-3.5" />
                              )
                            : (
                                <Copy className="w-3.5 h-3.5 opacity-0 group-hover/row:opacity-100 transition-opacity" />
                              )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SQL Tips */}
                <div className="bg-slate-100 rounded-xl p-4 border border-slate-200/50">
                  <h4 className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    💡 答题建议
                  </h4>
                  <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside leading-relaxed pl-1">
                    <li>
                      点击字段名右侧的
                      <Copy className="w-3 h-3 inline mx-0.5" />
                      {' '}
                      按钮，可直接复制字段名称。
                    </li>
                    <li>编写 SQL 语句时，注意表名及字段名的拼写与大小写必须一致。</li>
                    <li>部分填空题需要注意多余的空格或换行，系统会进行 SQL 标准化对比。</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Lightbox / Fullscreen Image Modal */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            onClick={() => setFullscreenImage(null)}
          >
            <button
              type="button"
              onClick={() => setFullscreenImage(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition duration-200 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              transition={{ type: 'spring', damping: 25 }}
              className="max-w-5xl max-h-[85vh] overflow-auto bg-slate-900 rounded-xl border border-white/10 p-4 shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <img
                src={fullscreenImage}
                alt="数据库表结构放大图"
                className="max-w-full max-h-[75vh] object-contain mx-auto"
              />
              <div className="text-center text-xs text-slate-400 mt-4 font-semibold tracking-wider">
                点击背景或右上角关闭
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
