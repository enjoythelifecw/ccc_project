import React from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  MapPinned,
  Megaphone,
  MessageSquareText,
  RefreshCw,
  ShieldAlert,
  Users,
} from 'lucide-react';
import AdminAnnouncementSection from './admin/AdminAnnouncementSection';
import AdminCoordinatesSection from './admin/AdminCoordinatesSection';
import AdminFeatureTabs from './admin/AdminFeatureTabs';
import AdminLinksSection from './admin/AdminLinksSection';
import AdminMapSection from './admin/AdminMapSection';
import AdminRecordsSection from './admin/AdminRecordsSection';
import AdminStats from './admin/AdminStats';
import useAdminDashboardData, { formatDate, getRecordSymbolId, getSymbolLabel } from '../hooks/useAdminDashboardData';

const adminLinks = [
  { label: '관리자 대시보드', path: '/admin-panel', desc: '기록 확인과 지도 핀 위치를 관리합니다.' },
  { label: '전체 작품 열기', path: '/admin', desc: '하트, 나누기, 십자가 작품을 모두 엽니다.' },
  { label: '하트 작품 열기', path: '/admin/heart', desc: '하트 카테고리 작품만 엽니다.' },
  { label: '나누기 작품 열기', path: '/admin/divide', desc: '나누기 카테고리 작품만 엽니다.' },
  { label: '십자가 작품 열기', path: '/admin/cross', desc: '십자가 카테고리 작품만 엽니다.' },
  { label: '기본 3개 열기', path: '/unlock/basic', desc: '각 카테고리 대표 작품 1개씩 엽니다.' },
  { label: '물음표 QR 페이지', path: '/?symbol=question', desc: '마지막 참여 페이지로 진입합니다.' },
  { label: '방문 기록 초기화', path: '/?reset=true', desc: '현재 기기의 발견 상태를 초기화합니다.' },
];

const recordTabs = [
  { id: 'visitors', label: '발견 기록', icon: Users },
  { id: 'artworks', label: '작품별', icon: MapPinned },
  { id: 'comments', label: '댓글', icon: MessageSquareText },
  { id: 'feedbacks', label: '소감', icon: Megaphone },
];

export default function AdminPanel({ onBack }) {
  const {
    activeFeature,
    setActiveFeature,
    activeTab,
    setActiveTab,
    announcementDraft,
    baseUrl,
    filteredArtworkSummaries,
    filteredComments,
    filteredFeedbacks,
    filteredVisitors,
    handleAnnouncementChange,
    handleCopy,
    handlePinMove,
    handleRefreshAll,
    handleReset,
    handleSave,
    handleSaveAnnouncement,
    handleToggleCommentPublish,
    handleToggleFeedbackPublish,
    isLoadingAnnouncement,
    isLoadingPins,
    isLoadingVisitors,
    isSaving,
    isSavingAnnouncement,
    mockSymbols,
    notification,
    pins,
    recordError,
    searchQuery,
    setSearchQuery,
    stats,
    tabCounts,
  } = useAdminDashboardData();

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 font-['Jua']">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10">
              <ShieldAlert className="h-5 w-5 text-cyan-200" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-white">작품 투어 관리자</h1>
              <p className="text-xs text-slate-400">운영 현황, 소감 공개, 공지, 지도 핀을 관리합니다.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="flex h-10 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 transition active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
              돌아가기
            </button>
            <button
              type="button"
              onClick={handleRefreshAll}
              className="flex h-10 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 transition active:scale-95"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingVisitors || isLoadingPins ? 'animate-spin' : ''}`} />
              새로고침
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5">
        <div className="grid content-start gap-5">
          <AdminStats stats={stats} />

          <AdminFeatureTabs activeFeature={activeFeature} onChange={setActiveFeature} />

          {activeFeature === 'records' && (
            <AdminRecordsSection
              recordTabs={recordTabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              tabCounts={tabCounts}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              recordError={recordError}
            >
            {activeTab === 'visitors' && (
              <VisitorList
                isLoading={isLoadingVisitors}
                visitors={filteredVisitors}
                emptyTitle="표시할 발견 기록이 없습니다."
              />
            )}

            {activeTab === 'artworks' && (
              <ArtworkList artworks={filteredArtworkSummaries} />
            )}

            {activeTab === 'comments' && (
              <RecordList
                records={filteredComments}
                emptyTitle="표시할 작품 댓글이 없습니다."
                renderItem={comment => (
                  <RecordCard
                    key={comment.id}
                    title={comment.name || '이름 없음'}
                    meta={`${getSymbolLabel(getRecordSymbolId(comment))} / ${formatDate(comment.createdAt)}`}
                    body={comment.content}
                    badge={comment.isPublished ? '공개 중' : '비공개'}
                    action={
                      <button
                        type="button"
                        onClick={() => handleToggleCommentPublish(comment)}
                        className={[
                          'flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition active:scale-95',
                          comment.isPublished
                            ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200'
                            : 'border-slate-700 bg-slate-900 text-slate-300',
                        ].join(' ')}
                      >
                        {comment.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {comment.isPublished ? '숨기기' : '공개'}
                      </button>
                    }
                  />
                )}
              />
            )}

            {activeTab === 'feedbacks' && (
              <RecordList
                records={filteredFeedbacks}
                emptyTitle="표시할 투어 소감이 없습니다."
                renderItem={feedback => (
                  <RecordCard
                    key={feedback.id}
                    title={feedback.name || '익명'}
                    meta={formatDate(feedback.createdAt)}
                    body={feedback.feedback}
                    badge={feedback.isPublished ? '공개 중' : '비공개'}
                    action={
                      <button
                        type="button"
                        onClick={() => handleToggleFeedbackPublish(feedback)}
                        className={[
                          'flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition active:scale-95',
                          feedback.isPublished
                            ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200'
                            : 'border-slate-700 bg-slate-900 text-slate-300',
                        ].join(' ')}
                      >
                        {feedback.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {feedback.isPublished ? '숨기기' : '공개'}
                      </button>
                    }
                  />
                )}
              />
            )}
            </AdminRecordsSection>
          )}

                    {activeFeature === 'map' && (
            <AdminMapSection
              isLoadingPins={isLoadingPins}
              isSaving={isSaving}
              mockSymbols={mockSymbols}
              pins={pins}
              onPinMove={handlePinMove}
              onReset={handleReset}
              onSave={handleSave}
            />
          )}
        </div>

        <div className="grid content-start gap-5">
                    {activeFeature === 'announcement' && (
            <AdminAnnouncementSection
              draft={announcementDraft}
              isLoading={isLoadingAnnouncement}
              isSaving={isSavingAnnouncement}
              onChange={handleAnnouncementChange}
              onSave={handleSaveAnnouncement}
            />
          )}

                    {activeFeature === 'links' && (
            <AdminLinksSection links={adminLinks} baseUrl={baseUrl} onCopy={handleCopy} />
          )}

                    {activeFeature === 'coordinates' && (
            <AdminCoordinatesSection pins={pins} getSymbolLabel={getSymbolLabel} />
          )}
        </div>
      </main>

      {notification.message && (
        <div
          className={[
            'fixed bottom-6 left-1/2 z-[100] flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-2 rounded-lg border px-4 py-3 shadow-2xl backdrop-blur',
            notification.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-950/90 text-emerald-200'
              : notification.type === 'warning'
                ? 'border-amber-500/30 bg-amber-950/90 text-amber-200'
                : 'border-rose-500/30 bg-rose-950/90 text-rose-200',
          ].join(' ')}
        >
          {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
          <span className="text-sm">{notification.message}</span>
        </div>
      )}
    </div>
  );
}

function ArtworkList({ artworks }) {
  if (artworks.length === 0) {
    return <EmptyState icon={MapPinned} title="표시할 작품 정보가 없습니다." />;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {artworks.map(artwork => (
        <article key={artwork.id} className="rounded-lg border border-slate-800 bg-slate-950/55 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-cyan-200">{artwork.category}</p>
              <h3 className="mt-1 text-lg font-bold text-white">{artwork.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{artwork.artist}</p>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-300">발견 {artwork.discoveredVisitors}</span>
              <span className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-300">
                댓글 {artwork.publishedComments}/{artwork.comments}
              </span>
            </div>
          </div>
          {artwork.desc && <p className="mt-3 text-sm leading-relaxed text-slate-300">{artwork.desc}</p>}
          {artwork.meaning && <p className="mt-2 text-sm leading-relaxed text-slate-400">{artwork.meaning}</p>}
          {artwork.location && (
            <p className="mt-3 rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400">
              위치: {artwork.location}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

function VisitorList({ isLoading, visitors, emptyTitle }) {
  if (isLoading) {
    return <EmptyState icon={RefreshCw} title="방문 기록을 불러오는 중입니다." spinning />;
  }

  if (visitors.length === 0) {
    return <EmptyState icon={Users} title={emptyTitle} />;
  }

  return (
    <div className="grid gap-3">
      {visitors.map(visitor => (
        <article key={visitor.id} className="rounded-lg border border-slate-800 bg-slate-950/55 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-100">방문자 {visitor.id.slice(0, 8)}</p>
              <p className="mt-1 text-xs text-slate-500">최근 갱신 {formatDate(visitor.updatedAt)}</p>
            </div>
            <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-200">
              {visitor.viewedSymbols.length}개 발견
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {visitor.viewedSymbols.map(symbol => (
              <span key={symbol.id} className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300">
                {symbol.label}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, spinning = false }) {
  return (
    <div className="flex min-h-[170px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-950/40 px-4 text-center">
      {React.createElement(icon, {
        className: `mb-3 h-7 w-7 text-slate-500 ${spinning ? 'animate-spin' : ''}`,
      })}
      <p className="text-sm text-slate-400">{title}</p>
    </div>
  );
}

function RecordList({ records, emptyTitle, renderItem }) {
  if (records.length === 0) {
    return <EmptyState icon={MessageSquareText} title={emptyTitle} />;
  }

  return <div className="grid gap-3">{records.map(renderItem)}</div>;
}

function RecordCard({ title, meta, body, badge, action }) {
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-950/55 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-bold text-slate-100">{title}</p>
            {badge && (
              <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">{meta}</p>
        </div>
        {action}
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">
        {body || '내용 없음'}
      </p>
    </article>
  );
}
