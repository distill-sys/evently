'use client';

import { useEffect, useState } from 'react';
import { generatePersonalizedRecommendations, type PersonalizedRecommendationsOutput } from '@/ai/flows/personalized-event-recommendations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ListChecks, ServerCrash } from 'lucide-react';

interface PersonalizedRecommendationsProps {
  userPreferences: string; // Mocked or fetched from user profile
  browsingHistory: string; // Mocked or fetched
}

export default function PersonalizedRecommendations({ userPreferences, browsingHistory }: PersonalizedRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<PersonalizedRecommendationsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecommendations() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await generatePersonalizedRecommendations({
          userPreferences,
          browsingHistory,
        });
        setRecommendations(result);
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
        setError("Sorry, we couldn't fetch your personalized recommendations at this time.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecommendations();
  }, [userPreferences, browsingHistory]);

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Fetching Personalized Recommendations...
            </CardTitle>
          <CardDescription className="font-body">We&apos;re curating events just for you.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-20 flex items-center justify-center">
            <p className="text-muted-foreground font-body">Please wait...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="shadow-lg">
        <ServerCrash className="h-5 w-5" />
        <AlertTitle className="font-headline">Error</AlertTitle>
        <AlertDescription className="font-body">{error}</AlertDescription>
      </Alert>
    );
  }

  if (!recommendations || !recommendations.shouldShowRecommendations || recommendations.eventRecommendations.length === 0) {
    return (
       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Personalized Recommendations</CardTitle>
          <CardDescription className="font-body">
            Keep browsing and saving events to get personalized recommendations here!
          </CardDescription>
        </CardHeader>
         <CardContent>
            <p className="text-muted-foreground font-body">No recommendations to show right now.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg bg-gradient-to-br from-accent/10 via-background to-background">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-accent flex items-center">
            <ListChecks className="mr-2 h-6 w-6" />
            Events You Might Like
        </CardTitle>
        <CardDescription className="font-body">Based on your preferences and browsing history.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 list-disc list-inside pl-2">
          {recommendations.eventRecommendations.map((rec, index) => (
            <li key={index} className="font-body text-foreground hover:text-primary transition-colors">
              {/* In a real app, these would be links to event details */}
              {rec}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
