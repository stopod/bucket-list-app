import { useState } from 'react';
import { Button } from '~/components/ui/button';

interface ExpandableTextProps {
  /** 表示するテキスト */
  text: string;
  /** 省略表示時の最大文字数 (デフォルト: 100) */
  maxLength?: number;
  /** 追加のCSSクラス */
  className?: string;
  /** テキストが短い場合のクラス */
  shortTextClassName?: string;
  /** 展開ボタンのクラス */
  buttonClassName?: string;
}

/**
 * 長いテキストを省略表示し、クリックで展開/折りたたみできるコンポーネント
 */
export function ExpandableText({
  text,
  maxLength = 100,
  className = "text-sm text-gray-600",
  shortTextClassName,
  buttonClassName = "text-xs text-blue-600 hover:text-blue-800 underline mt-1 p-0 h-auto font-normal"
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // テキストが短い場合は省略機能不要
  if (text.length <= maxLength) {
    return (
      <p className={shortTextClassName || className}>
        {text}
      </p>
    );
  }

  const truncatedText = text.slice(0, maxLength);
  const remainingText = text.slice(maxLength);

  return (
    <div>
      <p className={className}>
        {truncatedText}
        {!isExpanded && (
          <span className="relative">
            <span className="bg-gradient-to-r from-transparent to-white absolute -left-8 w-8 h-full"></span>
            ...
          </span>
        )}
        {isExpanded && remainingText}
      </p>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className={buttonClassName}
      >
        {isExpanded ? '折りたたむ' : '続きを読む'}
      </Button>
    </div>
  );
}

/**
 * シンプルバージョン: 外部状態で管理する場合
 */
interface ControlledExpandableTextProps {
  /** 表示するテキスト */
  text: string;
  /** 展開状態 */
  isExpanded: boolean;
  /** 展開状態切り替え関数 */
  onToggle: () => void;
  /** 省略表示時の最大文字数 (デフォルト: 100) */
  maxLength?: number;
  /** 追加のCSSクラス */
  className?: string;
  /** テキストが短い場合のクラス */
  shortTextClassName?: string;
  /** 展開ボタンのクラス */
  buttonClassName?: string;
}

/**
 * 外部状態で展開状態を管理するExpandableText
 * 複数のテキストの展開状態を一元管理したい場合に使用
 */
export function ControlledExpandableText({
  text,
  isExpanded,
  onToggle,
  maxLength = 100,
  className = "text-sm text-gray-600",
  shortTextClassName,
  buttonClassName = "text-xs text-blue-600 hover:text-blue-800 underline mt-1 p-0 h-auto font-normal"
}: ControlledExpandableTextProps) {
  // テキストが短い場合は省略機能不要
  if (text.length <= maxLength) {
    return (
      <p className={shortTextClassName || className}>
        {text}
      </p>
    );
  }

  const truncatedText = text.slice(0, maxLength);
  const remainingText = text.slice(maxLength);

  return (
    <div>
      <p className={className}>
        {truncatedText}
        {!isExpanded && (
          <span className="relative">
            <span className="bg-gradient-to-r from-transparent to-white absolute -left-8 w-8 h-full"></span>
            ...
          </span>
        )}
        {isExpanded && remainingText}
      </p>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className={buttonClassName}
      >
        {isExpanded ? '折りたたむ' : '続きを読む'}
      </Button>
    </div>
  );
}