
'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Filter, MapPin, Search, Tag } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useState } from 'react';
import { format } from 'date-fns';

interface SearchFilterBarProps {
  onSearch: (filters: { keyword: string; location: string; date: Date | undefined; category: string }) => void;
  categories: string[];
  locations: string[];
}

const ALL_LOCATIONS_VALUE = "--all-locations--";
const ALL_CATEGORIES_VALUE = "--all-categories--";

export default function SearchFilterBar({ onSearch, categories, locations }: SearchFilterBarProps) {
  const [keyword, setKeyword] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(''); // Renamed for clarity
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(); // Renamed for clarity
  const [selectedCategory, setSelectedCategory] = useState(''); // Renamed for clarity

  const handleSearchClick = () => {
    onSearch({ 
      keyword, 
      location: selectedLocation === ALL_LOCATIONS_VALUE ? '' : selectedLocation, 
      date: selectedDate, 
      category: selectedCategory === ALL_CATEGORIES_VALUE ? '' : selectedCategory 
    });
  };

  const handleClearFiltersClick = () => {
    setKeyword('');
    setSelectedLocation(ALL_LOCATIONS_VALUE); 
    setSelectedDate(undefined);
    setSelectedCategory(ALL_CATEGORIES_VALUE); 
    onSearch({ keyword: '', location: '', date: undefined, category: '' });
  }

  return (
    <div className="p-6 bg-card rounded-lg shadow-lg mb-8 space-y-4 md:space-y-0 md:flex md:gap-4 md:items-end">
      <div className="flex-grow">
        <label htmlFor="keyword-search" className="block text-sm font-medium text-foreground font-headline mb-1">
          Search Events
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="keyword-search"
            type="text"
            placeholder="Enter keyword, event name..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-10 font-body"
          />
        </div>
      </div>

      <div className="md:w-1/4">
        <label htmlFor="location-select" className="block text-sm font-medium text-foreground font-headline mb-1">
          Location
        </label>
        <Select value={selectedLocation || ALL_LOCATIONS_VALUE} onValueChange={setSelectedLocation}>
          <SelectTrigger className="font-body w-full">
            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Any Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_LOCATIONS_VALUE} className="font-body">Any Location</SelectItem>
            {locations.map(loc => <SelectItem key={loc} value={loc} className="font-body">{loc}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      
      <div className="md:w-1/4">
         <label htmlFor="date-picker" className="block text-sm font-medium text-foreground font-headline mb-1">
          Date
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date-picker"
              variant={"outline"}
              className="w-full justify-start text-left font-normal font-body"
            >
              <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
              {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="md:w-1/4">
        <label htmlFor="category-select" className="block text-sm font-medium text-foreground font-headline mb-1">
          Category
        </label>
        <Select value={selectedCategory || ALL_CATEGORIES_VALUE} onValueChange={setSelectedCategory}>
          <SelectTrigger className="font-body w-full">
            <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Any Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES_VALUE} className="font-body">Any Category</SelectItem>
            {categories.map(cat => <SelectItem key={cat} value={cat} className="font-body">{cat}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex gap-2 pt-4 md:pt-0 md:self-end">
        <Button onClick={handleSearchClick} className="font-body w-full md:w-auto">
          <Search className="mr-2 h-4 w-4" /> Search
        </Button>
         <Button onClick={handleClearFiltersClick} variant="outline" className="font-body w-full md:w-auto">
          <Filter className="mr-2 h-4 w-4" /> Clear
        </Button>
      </div>
    </div>
  );
}
