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
         <div className="relative h-48 bg-gradient-to-br from-primary to-accent">
            <Image
                src={organizer.profilePictureUrl}
                alt={organizer.name}
                width={120}
                height={120}
                className="rounded-full absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-4 border-card shadow-lg"
                data-ai-hint="person avatar"
            />
         </div>
      </CardHeader>
      <CardContent className="pt-20 p-6 text-center">
        <CardTitle className="font-headline text-3xl mb-2">{organizer.name}</CardTitle>
        <div className="flex items-center justify-center text-muted-foreground font-body mb-4">
            <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
            <span>Verified Organizer</span>
        </div>
        <CardDescription className="font-body text-base text-foreground leading-relaxed mb-6 line-clamp-4">
          {organizer.bio}
        </CardDescription>
        <div className="flex justify-around items-center border-t border-b py-4">
            <div className="text-center">
                <Users className="h-6 w-6 text-primary mx-auto mb-1" />
                <p className="font-headline text-xl font-semibold">{organizer.eventsHeld}</p>
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
