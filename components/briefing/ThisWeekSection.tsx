"use client";

import { motion } from "framer-motion";
import { BriefingTask, TasksByDay } from "@/types/briefing";

interface ThisWeekSectionProps {
  tasks: TasksByDay;
  onTaskClick: (threadId: string) => void;
}

interface TaskItemProps {
  task: BriefingTask;
  onClick: () => void;
}

function TaskItem({ task, onClick }: TaskItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-2 py-1.5 text-left group hover:bg-[#f5f4ed]/50 -mx-2 px-2 rounded transition-colors"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-(--text-secondary)/30 mt-1.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-sm text-[#3d3d3a] group-hover:text-(--accent) transition-colors line-clamp-1">
          {task.title}
        </span>
        <span className="text-xs text-(--text-secondary)/50 line-clamp-1">
          {task.databaseTitle}
        </span>
      </div>
      {task.status && (
        <span className="text-xs text-(--text-secondary)/60 shrink-0">
          {task.status}
        </span>
      )}
    </button>
  );
}

interface TaskBucketProps {
  label: string;
  tasks: BriefingTask[];
  isOverdue?: boolean;
  onTaskClick: (threadId: string) => void;
}

function TaskBucket({ label, tasks, isOverdue, onTaskClick }: TaskBucketProps) {
  if (tasks.length === 0) return null;

  return (
    <div className="mb-4 last:mb-0">
      <h3
        className={`text-xs font-medium uppercase tracking-wide mb-2 ${
          isOverdue ? "text-red-500/80" : "text-(--text-secondary)/50"
        }`}
      >
        {label}
        <span className="ml-1.5 text-(--text-secondary)/40">
          ({tasks.length})
        </span>
      </h3>
      <div className="space-y-0.5">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task.threadId)}
          />
        ))}
      </div>
    </div>
  );
}

export default function ThisWeekSection({
  tasks,
  onTaskClick,
}: ThisWeekSectionProps) {
  const hasTasks =
    tasks.overdue.length > 0 ||
    tasks.today.length > 0 ||
    tasks.tomorrow.length > 0 ||
    tasks.thisWeek.length > 0 ||
    tasks.unscheduled.length > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <h2 className="text-xs font-medium text-(--text-secondary)/60 uppercase tracking-wide mb-3">
        This Week
      </h2>

      <div className="p-4 rounded-lg border border-(--border-color)/50 bg-white/30">
        {!hasTasks && (
          <p className="text-(--text-secondary)/50 text-sm">
            No tasks scheduled for this week.
          </p>
        )}

        <TaskBucket
          label="Overdue"
          tasks={tasks.overdue}
          isOverdue
          onTaskClick={onTaskClick}
        />
        <TaskBucket
          label="Today"
          tasks={tasks.today}
          onTaskClick={onTaskClick}
        />
        <TaskBucket
          label="Tomorrow"
          tasks={tasks.tomorrow}
          onTaskClick={onTaskClick}
        />
        <TaskBucket
          label="Later This Week"
          tasks={tasks.thisWeek}
          onTaskClick={onTaskClick}
        />
        <TaskBucket
          label="Unscheduled"
          tasks={tasks.unscheduled}
          onTaskClick={onTaskClick}
        />
      </div>
    </motion.section>
  );
}
