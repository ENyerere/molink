import React from 'react';
import { type RenderLeafProps } from 'slate-react';

const Leaf = (props: RenderLeafProps) => {
  const { attributes, children, leaf } = props;

  let className = '';

  if (leaf.bold) className += ' font-bold';
  if (leaf.italic) className += ' italic';
  if (leaf.underline) className += ' underline';
  if (leaf.strikethrough) className += ' line-through';
  if (leaf.code) className += ' font-mono bg-muted px-1 py-0.5 rounded text-[0.875em]';

  if (leaf.link) {
    return (
      <a
        {...attributes}
        href={leaf.link}
        className={`text-primary underline underline-offset-2 hover:opacity-80 cursor-pointer${className}`}
        onClick={(e) => {
          e.preventDefault();
          window.open(leaf.link, '_blank');
        }}
      >
        {children}
      </a>
    );
  }

  return (
    <span {...attributes} className={className || undefined}>
      {children}
    </span>
  );
};

export default Leaf;
