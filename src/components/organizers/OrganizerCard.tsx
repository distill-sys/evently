import type { Organizer } from '@/lib/types';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, AlignLeft, CheckCircle } from 'lucide-react';

interface OrganizerCardProps {
  organizer: Organizer;
}

export default function OrganizerCard({ organizer }: OrganizerCardProps) {
  return (
    <Card className="shadow-xl overflow-hidden">
      <CardHeader className="p-0">
         {/* This div creates the gradient background. Adjusted height. */}
         <div className="h-32 bg-gradient-to-br from-primary to-accent" />
      </CardHeader>
      <CardContent className="p-6 text-center relative"> {/* Removed pt-20 */}
        {/* Image moved here, centered, with negative top margin to overlap header */}
        <Image
            src={organizer.profilePictureUrl || 'https://placehold.co/120x120.png'}
            alt={organizer.name}
            width={120}
            height={120}
            className="rounded-full mx-auto -mt-[60px] border-4 border-card shadow-lg mb-4" // -mt-[60px] pulls half the image height up
            data-ai-hint="person avatar"
        />
        {/* Text content now flows below the image */}
        <CardTitle className="font-headline text-3xl mb-2">{organizer.name}</CardTitle>
        <div className="flex items-center justify-center text-muted-foreground font-body mb-4">
            <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
            <span>Verified Organizer</span>
        </div>
        <CardDescription className="font-body text-base text-foreground leading-relaxed mb-6 line-clamp-4">
          {organizer.bio || 'No bio available.'}
        </CardDescription>
        <div className="flex justify-around items-center border-t border-b py-4">
            <div className="text-center">
                <Users className="h-6 w-6 text-primary mx-auto mb-1" />
                <p className="font-headline text-xl font-semibold">{organizer.eventsHeld || 0}</p>
                <p className="font-body text-xs text-muted-foreground">Events Held</p>
            </div>
            <div className="text-center">
                <AlignLeft className="h-6 w-6 text-primary mx-auto mb-1" />
                <p className="font-headline text-xl font-semibold">View Bio</p> {/* Or some other metric */}
                <p className="font-body text-xs text-muted-foreground">Details</p>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
