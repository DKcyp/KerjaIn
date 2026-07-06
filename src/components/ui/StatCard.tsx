import React from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: "blue" | "green" | "red" | "orange" | "purple";
  subtitle?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  color = "blue",
  subtitle,
}: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    green: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    red: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    orange: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
    purple: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
  };

  const textColorClasses = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    red: "text-red-600 dark:text-red-400",
    orange: "text-orange-600 dark:text-orange-400",
    purple: "text-purple-600 dark:text-purple-400",
  };

  return (
    <div
      className={`rounded-lg border-2 p-6 ${colorClasses[color]} transition-all hover:shadow-md`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            {title}
          </p>
          <p className={`text-3xl font-bold ${textColorClasses[color]}`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div className={`${textColorClasses[color]} opacity-80`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
