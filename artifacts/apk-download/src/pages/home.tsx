import { useState, useEffect } from "react";
import { useGetAppInfo, useRecordDownload, useGetRatings, useGetRatingsSummary, useSubmitRating, getGetRatingsQueryKey, getGetRatingsSummaryQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Stars } from "@/components/ui/stars";
import { ShieldCheck, Download, Smartphone, Info, Star, MessageSquare } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const reviewSchema = z.object({
  userName: z.string().min(2, "Name must be at least 2 characters").max(50),
  stars: z.number().min(1, "Please select a rating").max(5),
  reviewText: z.string().min(5, "Review must be at least 5 characters").max(500),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M+";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K+";
  }
  return num.toString();
}

export default function Home() {
  const { data: appInfo, isLoading: isAppInfoLoading } = useGetAppInfo();
  const { data: ratingsData, isLoading: isRatingsLoading } = useGetRatings({ page: 1, limit: 5 });
  const { data: ratingsSummary, isLoading: isSummaryLoading } = useGetRatingsSummary();
  const recordDownload = useRecordDownload();
  const submitRating = useSubmitRating();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      userName: "",
      stars: 5,
      reviewText: "",
    },
  });

  useEffect(() => {
    if (appInfo?.iconUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = appInfo.iconUrl;
    }
  }, [appInfo?.iconUrl]);

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const handleDownload = () => {
    recordDownload.mutate(undefined, {
      onSuccess: (data) => {
        window.location.href = data.downloadUrl;
        toast({
          title: "Download Started",
          description: "Your download will begin shortly.",
        });
      },
      onError: () => {
        toast({
          title: "Download Failed",
          description: "There was an error starting your download. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const onSubmitReview = (values: ReviewFormValues) => {
    submitRating.mutate({ data: values }, {
      onSuccess: () => {
        toast({
          title: "Review Submitted",
          description: "Thank you for your feedback!",
        });
        form.reset();
        queryClient.invalidateQueries({ queryKey: getGetRatingsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRatingsSummaryQueryKey() });
      },
      onError: () => {
        toast({
          title: "Failed to submit review",
          description: "Please try again later.",
          variant: "destructive",
        });
      }
    });
  };

  if (isAppInfoLoading || !appInfo) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
        <div className="flex gap-6">
          <Skeleton className="w-24 h-24 md:w-32 md:h-32 rounded-2xl" />
          <div className="space-y-4 flex-1">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 space-y-12">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-3xl overflow-hidden shadow-sm border border-border/50 bg-muted">
            <img 
              src={appInfo.iconUrl} 
              alt={`${appInfo.name} icon`}
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="flex-1 space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground" data-testid="text-app-name">
              {appInfo.name}
            </h1>
            <p className="text-lg text-primary font-medium" data-testid="text-developer">
              {appInfo.developer}
            </p>
            <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
              {appInfo.shortDescription}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="secondary" className="font-medium">
                {appInfo.category}
              </Badge>
              <Badge variant="outline" className="text-muted-foreground font-medium flex items-center gap-1">
                <ShieldCheck size={14} />
                Verified Safe
              </Badge>
            </div>
          </div>
        </section>

        {/* Hero Stats & Download */}
        <section className="flex flex-col gap-6">
          <div className="grid grid-cols-4 divide-x divide-border rounded-xl border border-border bg-card p-4 shadow-sm text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1 font-bold text-lg">
                {appInfo.averageRating.toFixed(1)} <Star className="fill-foreground text-foreground" size={16} />
              </div>
              <div className="text-xs text-muted-foreground">{formatNumber(appInfo.totalRatings)} reviews</div>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-lg">{formatNumber(appInfo.downloadCount)}</div>
              <div className="text-xs text-muted-foreground">Downloads</div>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-lg">{appInfo.contentRating}</div>
              <div className="text-xs text-muted-foreground">Content Rating</div>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-lg">{appInfo.fileSize}</div>
              <div className="text-xs text-muted-foreground">Size</div>
            </div>
          </div>
          
          <Button 
            size="lg" 
            className="w-full text-lg h-14 rounded-xl shadow-md font-semibold"
            onClick={handleDownload}
            disabled={recordDownload.isPending}
            data-testid="button-download"
          >
            {recordDownload.isPending ? "Starting Download..." : "Download APK"}
          </Button>
        </section>

        {/* What's New */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Info className="text-primary" size={24} />
            What's New
          </h2>
          <Card className="shadow-sm border-border/50 bg-card/50">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Version {appInfo.version} • Updated {new Date(appInfo.updatedAt).toLocaleDateString()}</p>
              <p className="text-sm whitespace-pre-line leading-relaxed">{appInfo.whatsNew}</p>
            </CardContent>
          </Card>
        </section>

        {/* App Description */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Smartphone className="text-primary" size={24} />
            About this app
          </h2>
          <div className="relative">
            <div className={cn(
              "text-sm text-foreground/90 whitespace-pre-line leading-relaxed transition-all",
              !isDescriptionExpanded && "line-clamp-4"
            )}>
              {appInfo.description}
            </div>
            {!isDescriptionExpanded && (
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent" />
            )}
          </div>
          <Button 
            variant="ghost" 
            className="text-primary font-medium p-0 h-auto hover:bg-transparent hover:text-primary/80"
            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
          >
            {isDescriptionExpanded ? "Show less" : "Show more"}
          </Button>
          <div className="flex flex-wrap gap-2 pt-2">
            {appInfo.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="bg-secondary/50 hover:bg-secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </section>

        {/* App Info Grid */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold">App Info</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Version</p>
              <p className="font-medium">{appInfo.version}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Updated on</p>
              <p className="font-medium">{new Date(appInfo.updatedAt).toLocaleDateString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Released on</p>
              <p className="font-medium">{new Date(appInfo.releasedAt).toLocaleDateString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Package</p>
              <p className="font-medium truncate" title={appInfo.packageName}>{appInfo.packageName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Requires Android</p>
              <p className="font-medium">{appInfo.minAndroidVersion} and up</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Target Android</p>
              <p className="font-medium">{appInfo.targetAndroidVersion}</p>
            </div>
          </div>
          <div className="pt-2">
            <p className="text-muted-foreground text-sm mb-2">Permissions</p>
            <div className="flex flex-wrap gap-2">
              {appInfo.permissions.map(perm => (
                <Badge key={perm} variant="outline" className="text-xs font-normal border-border/50">
                  {perm}
                </Badge>
              ))}
            </div>
          </div>
        </section>

        {/* Ratings and Reviews */}
        <section className="space-y-8 pt-8 border-t border-border">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="text-primary" size={24} />
            Ratings and reviews
          </h2>

          {isSummaryLoading || !ratingsSummary ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="text-center md:text-left space-y-2">
                <div className="text-5xl font-bold">{ratingsSummary.averageRating.toFixed(1)}</div>
                <Stars rating={ratingsSummary.averageRating} size={20} className="justify-center md:justify-start" />
                <div className="text-sm text-muted-foreground">{formatNumber(ratingsSummary.totalRatings)} ratings</div>
              </div>
              <div className="flex-1 w-full space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingsSummary.breakdown[star.toString() as keyof typeof ratingsSummary.breakdown] || 0;
                  const percentage = ratingsSummary.totalRatings > 0 ? (count / ratingsSummary.totalRatings) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-3 text-sm">
                      <div className="w-4 text-right font-medium">{star}</div>
                      <Progress value={percentage} className="h-2 flex-1" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit Review Form */}
          <Card className="bg-card shadow-sm border-border/50 mt-8">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">Write a review</h3>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitReview)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="userName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="stars"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rating</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-1 h-10">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => field.onChange(star)}
                                  className="focus:outline-none transition-transform hover:scale-110"
                                >
                                  <Star
                                    size={28}
                                    className={cn(
                                      "transition-colors",
                                      star <= field.value
                                        ? "fill-primary text-primary"
                                        : "text-muted-foreground fill-transparent"
                                    )}
                                  />
                                </button>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="reviewText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Review</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell others what you think about this app..." 
                            className="resize-none h-24"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={submitRating.isPending} data-testid="button-submit-review">
                    {submitRating.isPending ? "Submitting..." : "Submit Review"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* User Reviews List */}
          <div className="space-y-6 pt-4">
            {isRatingsLoading || !ratingsData ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-16 w-full" />
                </div>
              ))
            ) : ratingsData.ratings.length > 0 ? (
              ratingsData.ratings.map((review) => (
                <div key={review.id} className="space-y-2 border-b border-border/50 pb-6 last:border-0" data-testid={`review-${review.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {review.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{review.userName}</p>
                        <div className="flex items-center gap-2">
                          <Stars rating={review.stars} size={12} />
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed mt-2">{review.reviewText}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No reviews yet. Be the first to review!</p>
            )}
          </div>
        </section>

      </div>
      
      {/* Footer */}
      <footer className="mt-20 border-t border-border bg-card/50 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} {appInfo.developer}. All rights reserved.</p>
        <p className="mt-1">Google Play and the Google Play logo are trademarks of Google LLC.</p>
      </footer>
    </div>
  );
}