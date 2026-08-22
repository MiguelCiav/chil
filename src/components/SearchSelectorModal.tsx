import React, { useState } from 'react';
import { Search, Check } from 'lucide-react';
import { Modal, ModalHeader, ModalBody } from './Modal';

interface SearchSelectorModalProps<T> {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly placeholder: string;
  readonly items: readonly T[];
  readonly selectedId: string | null;
  readonly onSelect: (item: T) => void;
  readonly searchFilter: (item: T, query: string) => boolean;
  readonly renderItem: (item: T) => React.ReactNode;
  readonly keyExtractor: (item: T) => string | number;
}

export function SearchSelectorModal<T>({
  isOpen,
  onClose,
  title,
  placeholder,
  items,
  selectedId,
  onSelect,
  searchFilter,
  renderItem,
  keyExtractor
}: Readonly<SearchSelectorModalProps<T>>) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = items.filter(item => searchFilter(item, searchQuery));

  const handleSelect = (item: T) => {
    onSelect(item);
    setSearchQuery('');
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-md font-sans">
      <ModalHeader onClose={handleClose}>
        <span className="flex items-center gap-2 text-primary font-bold">
          {title}
        </span>
      </ModalHeader>
      <ModalBody className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral/40 w-4 h-4" />
          <input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all h-[46px]"
          />
        </div>
        <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
          {filteredItems.length === 0 ? (
            <p className="text-sm text-neutral/40 text-center py-4">No se encontraron resultados</p>
          ) : (
            filteredItems.map(item => {
              const key = keyExtractor(item);
              const itemId = String(key);
              const isSelected = selectedId === itemId;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between group ${isSelected
                    ? 'bg-primary text-white font-semibold'
                    : 'hover:bg-primary/5 text-neutral'
                    }`}
                >
                  {renderItem(item)}
                  {isSelected && <Check className="w-4 h-4" />}
                </button>
              );
            })
          )}
        </div>
      </ModalBody>
    </Modal>
  );
}
