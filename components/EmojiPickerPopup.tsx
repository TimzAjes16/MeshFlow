'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Smartphone, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Node } from '@/types/Node';

interface EmojiPickerPopupProps {
  node: Node;
  position: { x: number; y: number };
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

// Apple emoji categories
const APPLE_EMOJI_CATEGORIES = {
  'Smileys & People': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '😵', '😵‍💫', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
  'Animals & Nature': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🪶', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'],
  'Food & Drink': ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🥞', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🥫', '🫕', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '🫖', '☕️', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊'],
  'Activity & Sports': ['⚽️', '🏀', '🏈', '⚾️', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳️', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️‍♀️', '🏋️', '🏋️‍♂️', '🤼‍♀️', '🤼', '🤼‍♂️', '🤸‍♀️', '🤸', '🤸‍♂️', '⛹️‍♀️', '⛹️', '⛹️‍♂️', '🤺', '🤾‍♀️', '🤾', '🤾‍♂️', '🏌️‍♀️', '🏌️', '🏌️‍♂️', '🏇', '🧘‍♀️', '🧘', '🧘‍♂️', '🏄‍♀️', '🏄', '🏄‍♂️', '🏊‍♀️', '🏊', '🏊‍♂️', '🤽‍♀️', '🤽', '🤽‍♂️', '🚣‍♀️', '🚣', '🚣‍♂️', '🧗‍♀️', '🧗', '🧗‍♂️', '🚵‍♀️', '🚵', '🚵‍♂️', '🚴‍♀️', '🚴', '🚴‍♂️', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹‍♀️', '🤹', '🤹‍♂️', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🪗', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩'],
  'Travel & Places': ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🦯', '🦽', '🦼', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🪂', '💺', '🚁', '🚟', '🚠', '🚡', '🛰️', '🚀', '🛸', '🛎️', '🧳', '⌛️', '⏳', '⌚️', '⏰', '⏲️', '⏱️', '🧭', '🎈', '🎉', '🎊', '🎁', '🎀', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷️', '🪧', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅', '🗑️', '📇', '🗃️', '🗳️', '🗄️', '📋', '📁', '📂', '🗂️', '🗞️', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇️', '📐', '📏', '🧮', '📌', '📍', '✂️', '🖊️', '🖋️', '✒️', '🖌️', '🖍️', '📝', '✏️', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓'],
  'Objects': ['💎', '🔪', '⚔️', '🗡️', '🛡️', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🪠', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼', '🪥', '🪒', '🧽', '🪣', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🪆', '🖼️', '🪞', '🪟', '🛍️', '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷️', '🪧'],
  'Symbols': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈️', '♉️', '♊️', '♋️', '♌️', '♍️', '♎️', '♏️', '♐️', '♑️', '♒️', '♓️', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚️', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕️', '🛑', '⛔️', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗️', '❓', '❕', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯️', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿️', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩️', '⏪️', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '♾️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘', '⚪️', '⚫️', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫️', '⚪️', '🟤', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '💠', '🔘', '🔳', '🔲', '▪️', '▫️', '◾️', '◽️', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛️', '⬜️', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄️', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧'],
  'Flags': ['🏳️', '🏴', '🏁', '🚩', '🏳️‍🌈', '🏳️‍⚧️', '🇺🇳', '🇦🇫', '🇦🇽', '🇦🇱', '🇩🇿', '🇦🇸', '🇦🇩', '🇦🇴', '🇦🇮', '🇦🇶', '🇦🇬', '🇦🇷', '🇦🇲', '🇦🇼', '🇦🇺', '🇦🇹', '🇦🇿', '🇧🇸', '🇧🇭', '🇧🇩', '🇧🇧', '🇧🇾', '🇧🇪', '🇧🇿', '🇧🇯', '🇧🇲', '🇧🇹', '🇧🇴', '🇧🇦', '🇧🇼', '🇧🇷', '🇮🇴', '🇻🇬', '🇧🇳', '🇧🇬', '🇧🇫', '🇧🇮', '🇰🇭', '🇨🇲', '🇨🇦', '🇮🇶', '🇨🇻', '🇧🇶', '🇰🇾', '🇨🇫', '🇹🇩', '🇨🇱', '🇨🇳', '🇨🇽', '🇨🇨', '🇨🇴', '🇰🇲', '🇨🇬', '🇨🇩', '🇨🇰', '🇨🇷', '🇨🇮', '🇭🇷', '🇨🇺', '🇨🇼', '🇨🇾', '🇨🇿', '🇩🇰', '🇩🇯', '🇩🇲', '🇩🇴', '🇪🇨', '🇪🇬', '🇸🇻', '🇬🇶', '🇪🇷', '🇪🇪', '🇸🇿', '🇪🇹', '🇪🇺', '🇫🇰', '🇫🇴', '🇫🇯', '🇫🇮', '🇫🇷', '🇬🇫', '🇵🇫', '🇹🇫', '🇬🇦', '🇬🇲', '🇬🇪', '🇩🇪', '🇬🇭', '🇬🇮', '🇬🇷', '🇬🇱', '🇬🇩', '🇬🇵', '🇬🇺', '🇬🇹', '🇬🇬', '🇬🇳', '🇬🇼', '🇬🇾', '🇭🇹', '🇭🇳', '🇭🇰', '🇭🇺', '🇮🇸', '🇮🇳', '🇮🇩', '🇮🇷', '🇮🇶', '🇮🇪', '🇮🇲', '🇮🇱', '🇮🇹', '🇯🇲', '🇯🇵', '🎌', '🇯🇪', '🇯🇴', '🇰🇿', '🇰🇪', '🇰🇮', '🇽🇰', '🇰🇼', '🇰🇬', '🇱🇦', '🇱🇻', '🇱🇧', '🇱🇸', '🇱🇷', '🇱🇾', '🇱🇮', '🇱🇹', '🇱🇺', '🇲🇴', '🇲🇬', '🇲🇼', '🇲🇾', '🇲🇻', '🇲🇱', '🇲🇹', '🇲🇭', '🇲🇶', '🇲🇷', '🇲🇺', '🇾🇹', '🇲🇽', '🇫🇲', '🇲🇩', '🇲🇨', '🇲🇳', '🇲🇪', '🇲🇸', '🇲🇦', '🇲🇿', '🇲🇲', '🇳🇦', '🇳🇷', '🇳🇵', '🇳🇱', '🇳🇨', '🇳🇿', '🇳🇮', '🇳🇪', '🇳🇬', '🇳🇺', '🇳🇫', '🇰🇵', '🇲🇰', '🇲🇵', '🇳🇴', '🇴🇲', '🇵🇰', '🇵🇼', '🇵🇸', '🇵🇦', '🇵🇬', '🇵🇾', '🇵🇪', '🇵🇭', '🇵🇳', '🇵🇱', '🇵🇹', '🇵🇷', '🇶🇦', '🇷🇪', '🇷🇴', '🇷🇺', '🇷🇼', '🇼🇸', '🇸🇲', '🇸🇦', '🇸🇳', '🇷🇸', '🇸🇨', '🇸🇱', '🇸🇬', '🇸🇽', '🇸🇰', '🇸🇮', '🇬🇸', '🇸🇧', '🇸🇴', '🇿🇦', '🇰🇷', '🇸🇸', '🇪🇸', '🇱🇰', '🇧🇱', '🇸🇭', '🇰🇳', '🇱🇨', '🇵🇲', '🇻🇨', '🇸🇩', '🇸🇷', '🇸🇪', '🇨🇭', '🇸🇾', '🇹🇼', '🇹🇯', '🇹🇿', '🇹🇭', '🇹🇱', '🇹🇬', '🇹🇰', '🇹🇴', '🇹🇹', '🇹🇳', '🇹🇷', '🇹🇲', '🇹🇨', '🇹🇻', '🇻🇮', '🇺🇬', '🇺🇦', '🇦🇪', '🇬🇧', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', '🇺🇸', '🇺🇾', '🇺🇿', '🇻🇺', '🇻🇦', '🇻🇪', '🇻🇳', '🇼🇫', '🇪🇭', '🇾🇪', '🇿🇲', '🇿🇼']
};

export default function EmojiPickerPopup({ node, position, onClose, onSelect }: EmojiPickerPopupProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Smileys & People');
  const [emojiStyle, setEmojiStyle] = useState<'apple' | 'device'>('apple');
  // Track emoji counts: { emoji: count }
  const [selectedEmojis, setSelectedEmojis] = useState<Record<string, number>>(() => {
    // Initialize with existing emojis from node
    const counts: Record<string, number> = {};
    if (node.content && typeof node.content === 'object' && 'emoji' in node.content) {
      const emojiData = (node.content as any).emoji;
      if (Array.isArray(emojiData)) {
        emojiData.forEach((emoji: string) => {
          counts[emoji] = (counts[emoji] || 0) + 1;
        });
      } else if (typeof emojiData === 'string') {
        counts[emojiData] = 1;
      }
    } else if (node.title && node.title !== '😀' && node.title !== 'Emoji') {
      // Parse title into emojis and count them
      Array.from(node.title).forEach((char) => {
        const codePoint = char.codePointAt(0);
        if (codePoint && (
          (codePoint >= 0x1F300 && codePoint <= 0x1F9FF) ||
          (codePoint >= 0x1F600 && codePoint <= 0x1F64F) ||
          (codePoint >= 0x1F680 && codePoint <= 0x1F6FF) ||
          (codePoint >= 0x2600 && codePoint <= 0x26FF) ||
          (codePoint >= 0x2700 && codePoint <= 0x27BF)
        )) {
          counts[char] = (counts[char] || 0) + 1;
        }
      });
    }
    return counts;
  });
  // Track selection order (stack: last in, first out)
  const [selectionOrder, setSelectionOrder] = useState<string[]>(() => {
    // Initialize with existing emojis in order
    const order: string[] = [];
    if (node.content && typeof node.content === 'object' && 'emoji' in node.content) {
      const emojiData = (node.content as any).emoji;
      if (Array.isArray(emojiData)) {
        return emojiData;
      } else if (typeof emojiData === 'string') {
        return [emojiData];
      }
    } else if (node.title && node.title !== '😀' && node.title !== 'Emoji') {
      // Parse title into emojis in order
      Array.from(node.title).forEach((char) => {
        const codePoint = char.codePointAt(0);
        if (codePoint && (
          (codePoint >= 0x1F300 && codePoint <= 0x1F9FF) ||
          (codePoint >= 0x1F600 && codePoint <= 0x1F64F) ||
          (codePoint >= 0x1F680 && codePoint <= 0x1F6FF) ||
          (codePoint >= 0x2600 && codePoint <= 0x26FF) ||
          (codePoint >= 0x2700 && codePoint <= 0x27BF)
        )) {
          order.push(char);
        }
      });
    }
    return order;
  });
  const popupRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && event.target instanceof Node && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Handle keyboard shortcuts (Escape and Backspace)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'Backspace') {
        // Remove last selected emoji
        if (selectionOrder.length > 0) {
          const lastEmoji = selectionOrder[selectionOrder.length - 1];
          setSelectedEmojis((prev) => {
            const newCounts = { ...prev };
            if (newCounts[lastEmoji] > 1) {
              newCounts[lastEmoji] = newCounts[lastEmoji] - 1;
            } else {
              delete newCounts[lastEmoji];
            }
            return newCounts;
          });
          setSelectionOrder((prev) => prev.slice(0, -1));
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, selectionOrder]);

  const categories = Object.keys(APPLE_EMOJI_CATEGORIES);
  const currentEmojis = APPLE_EMOJI_CATEGORIES[selectedCategory as keyof typeof APPLE_EMOJI_CATEGORIES] || [];

  // For device emojis, we'll use the same emojis but they'll render with device's native emoji style
  // The emojiStyle toggle is mainly for visual indication - actual rendering depends on OS/browser

  const handleEmojiClick = (emoji: string) => {
    // Increment count for this emoji
    setSelectedEmojis((prev) => ({
      ...prev,
      [emoji]: (prev[emoji] || 0) + 1,
    }));
    // Add to selection order (for backspace functionality)
    setSelectionOrder((prev) => [...prev, emoji]);
  };

  const handleDone = () => {
    // Use selection order to maintain the order emojis were selected
    if (selectionOrder.length > 0) {
      onSelect(selectionOrder.join(''));
    }
    onClose();
  };

  const handleRemoveEmoji = (emoji: string) => {
    setSelectedEmojis((prev) => {
      const newCounts = { ...prev };
      if (newCounts[emoji] > 1) {
        newCounts[emoji] = newCounts[emoji] - 1;
      } else {
        delete newCounts[emoji];
      }
      return newCounts;
    });
    // Remove last occurrence of this emoji from selection order
    setSelectionOrder((prev) => {
      const lastIndex = prev.lastIndexOf(emoji);
      if (lastIndex !== -1) {
        return prev.filter((_, idx) => idx !== lastIndex);
      }
      return prev;
    });
  };

  const handleClearAll = () => {
    setSelectedEmojis({});
    setSelectionOrder([]);
  };

  // Get total count of all emojis
  const totalEmojiCount = Object.values(selectedEmojis).reduce((sum, count) => sum + count, 0);
  
  // Get array of unique emojis for display
  const uniqueEmojis = Object.keys(selectedEmojis);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <motion.div
          ref={popupRef}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative bg-white rounded-2xl shadow-2xl w-[90vw] max-w-[800px] h-[85vh] max-h-[750px] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">Choose an Emoji</h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-gray-200">
                <button
                  onClick={() => setEmojiStyle('apple')}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
                    emojiStyle === 'apple' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span className="text-sm font-medium">Apple</span>
                </button>
                <div className="w-px h-4 bg-gray-300" />
                <button
                  onClick={() => setEmojiStyle('device')}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
                    emojiStyle === 'device' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span className="text-sm font-medium">Device</span>
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 px-4 py-2 bg-gray-50 border-b border-gray-200 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Selected Emojis Preview */}
          {uniqueEmojis.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-200 bg-blue-50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  <span className="text-sm font-medium text-gray-700">Selected:</span>
                  {uniqueEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleRemoveEmoji(emoji)}
                      className="text-2xl hover:scale-110 transition-transform relative group"
                      title={`Click to remove (${selectedEmojis[emoji]}x)`}
                    >
                      {emoji}
                      {selectedEmojis[emoji] > 1 && (
                        <span className="absolute -top-1 -right-1 text-xs bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-semibold shadow-md">
                          {selectedEmojis[emoji]}
                        </span>
                      )}
                      <span className="absolute -bottom-1 -right-1 text-xs bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        ×
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleClearAll}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}

          {/* Emoji Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-3">
              {currentEmojis.map((emoji, index) => {
                const count = selectedEmojis[emoji] || 0;
                const isSelected = count > 0;
                return (
                  <button
                    key={`${emoji}-${index}`}
                    onClick={() => handleEmojiClick(emoji)}
                    className={`text-3xl rounded-lg p-2 transition-all active:scale-90 relative ${
                      isSelected
                        ? 'bg-blue-100 ring-2 ring-blue-500 scale-110'
                        : 'hover:bg-gray-100'
                    }`}
                    title={count > 0 ? `${emoji} (${count}x)` : emoji}
                  >
                    {emoji}
                    {count > 0 && (
                      <span className="absolute -top-1 -right-1 text-xs bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-semibold shadow-md">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {totalEmojiCount > 0 ? (
                <span>
                  {totalEmojiCount} emoji{totalEmojiCount > 1 ? 's' : ''} selected ({uniqueEmojis.length} unique)
                  <span className="ml-2 text-xs text-gray-400">• Press Backspace to remove last</span>
                </span>
              ) : (
                'Click emojis to add them'
              )}
            </div>
            <div className="flex items-center gap-3">
              {totalEmojiCount > 0 && (
                <div className="text-3xl flex items-center gap-1">
                  {Object.entries(selectedEmojis).map(([emoji, count]) => (
                    <span key={emoji} className="relative">
                      {emoji}
                      {count > 1 && (
                        <span className="absolute -top-1 -right-1 text-xs bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-semibold">
                          {count}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              )}
              <button
                onClick={handleDone}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                disabled={totalEmojiCount === 0}
              >
                Done
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

