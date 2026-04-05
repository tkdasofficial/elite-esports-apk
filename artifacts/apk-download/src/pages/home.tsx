import { useState } from "react";
import {
  useGetAppInfo,
  useRecordDownload,
  useGetRatings,
  useGetRatingsSummary,
  useSubmitRating,
  getGetRatingsQueryKey,
  getGetRatingsSummaryQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Stars } from "@/components/ui/stars";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Shield,
  Star,
  Smartphone,
  Info,
  Tag,
  Lock,
} from "lucide-react";

const reviewSchema = z.object({
  userName: z.string().min(2, "Name must be at least 2 characters").max(50),
  stars: z.number().min(1, "Please select a rating").max(5),
  reviewText: z
    .string()
    .min(5, "Review must be at least 5 characters")
    .max(500),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    const v = num / 1_000_000;
    return (Number.isInteger(v) ? v : v.toFixed(1)) + "M+";
  }
  if (num >= 1_000) {
    const v = num / 1_000;
    return (Number.isInteger(v) ? v : v.toFixed(1)) + "K+";
  }
  return num.toLocaleString();
}

function SectionDivider() {
  return <div className="h-2 bg-muted -mx-4 sm:-mx-6" />;
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={20} className="text-primary" />
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
    </div>
  );
}

function RatingStarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none transition-transform active:scale-90"
          data-testid={`star-picker-${star}`}
        >
          <Star
            size={32}
            className={cn(
              "transition-colors",
              star <= (hovered || value)
                ? "fill-primary text-primary"
                : "fill-muted text-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: { id: number; userName: string; stars: number; reviewText: string; createdAt: string; helpful: number } }) {
  const initials = review.userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="py-4 border-b border-border last:border-0"
      data-testid={`review-${review.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-bold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium truncate">{review.userName}</p>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
            </span>
          </div>
          <div className="mt-0.5 mb-2">
            <Stars rating={review.stars} size={13} />
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed">
            {review.reviewText}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { data: appInfo, isLoading: isAppInfoLoading } = useGetAppInfo();
  const { data: ratingsData, isLoading: isRatingsLoading } = useGetRatings({
    page: 1,
    limit: 10,
  });
  const { data: ratingsSummary, isLoading: isSummaryLoading } = useGetRatingsSummary();
  const recordDownload = useRecordDownload();
  const submitRating = useSubmitRating();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isPermissionsExpanded, setIsPermissionsExpanded] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { userName: "", stars: 5, reviewText: "" },
  });

  const handleDownload = () => {
    recordDownload.mutate(undefined, {
      onSuccess: (data) => {
        const link = document.createElement("a");
        link.href = data.downloadUrl;
        link.download = "elite-esports.apk";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Download started", description: "Your APK download has begun." });
      },
      onError: () => {
        toast({
          title: "Download failed",
          description: "Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const onSubmitReview = (values: ReviewFormValues) => {
    submitRating.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast({ title: "Review submitted", description: "Thank you for your feedback!" });
          form.reset();
          setReviewSubmitted(true);
          queryClient.invalidateQueries({ queryKey: getGetRatingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetRatingsSummaryQueryKey() });
        },
        onError: () => {
          toast({
            title: "Failed to submit review",
            description: "Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (isAppInfoLoading || !appInfo) {
    return (
      <div className="max-w-2xl mx-auto pb-20">
        <div className="px-4 sm:px-6 pt-8 space-y-6">
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="w-28 h-28 rounded-3xl" />
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-12 w-full rounded-full" />
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const descriptionLines = appInfo.description.split("\n");
  const shortDesc = descriptionLines.slice(0, 4).join("\n");
  const needsExpand = descriptionLines.length > 4 || appInfo.description.length > 250;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto">

        {/* ── App Header ── */}
        <section className="px-4 sm:px-6 pt-8 pb-6 flex flex-col items-center text-center gap-3">
          <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-md border border-border/30">
            <img
              src={appInfo.iconUrl}
              alt={`${appInfo.name} icon`}
              className="w-full h-full object-cover"
              data-testid="img-app-icon"
            />
          </div>
          <div>
            <h1
              className="text-2xl font-bold tracking-tight text-foreground leading-tight"
              data-testid="text-app-name"
            >
              {appInfo.name}
            </h1>
            <p className="text-sm text-primary font-semibold mt-0.5" data-testid="text-developer">
              {appInfo.developer}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <Badge variant="secondary" className="text-xs px-2.5 py-0.5">
              {appInfo.category}
            </Badge>
            <Badge variant="outline" className="text-xs px-2.5 py-0.5 text-muted-foreground flex items-center gap-1 border-border/50">
              <Shield size={11} />
              Verified Safe
            </Badge>
            <Badge variant="outline" className="text-xs px-2.5 py-0.5 text-muted-foreground border-border/50">
              {appInfo.contentRating}
            </Badge>
          </div>
        </section>

        <SectionDivider />

        {/* ── Stats Bar ── */}
        <section className="px-4 sm:px-6 py-4">
          <div className="grid grid-cols-4 divide-x divide-border">
            <div className="flex flex-col items-center gap-0.5 px-2">
              <span className="text-sm font-bold leading-tight">
                {appInfo.averageRating > 0 ? appInfo.averageRating.toFixed(1) : "—"}
              </span>
              <Star size={11} className="fill-primary text-primary" />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                {formatNumber(appInfo.totalRatings)} ratings
              </span>
            </div>
            <div className="flex flex-col items-center gap-0.5 px-2">
              <Download size={14} className="text-foreground" />
              <span className="text-sm font-bold leading-tight">{formatNumber(appInfo.downloadCount)}</span>
              <span className="text-[10px] text-muted-foreground">Downloads</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 px-2">
              <span className="text-sm font-bold leading-tight">{appInfo.contentRating}</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                Content rating
              </span>
            </div>
            <div className="flex flex-col items-center gap-0.5 px-2">
              <Smartphone size={14} className="text-foreground" />
              <span className="text-sm font-bold leading-tight">{appInfo.fileSize}</span>
              <span className="text-[10px] text-muted-foreground">Size</span>
            </div>
          </div>
        </section>

        <SectionDivider />

        {/* ── Download Button ── */}
        <section className="px-4 sm:px-6 py-5">
          <Button
            size="lg"
            className="w-full h-12 rounded-full text-base font-semibold shadow-sm tracking-wide"
            onClick={handleDownload}
            disabled={recordDownload.isPending}
            data-testid="button-download"
          >
            {recordDownload.isPending ? (
              <span className="flex items-center gap-2">
                <Download size={18} className="animate-bounce" />
                Starting download...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Download size={18} />
                Download APK
              </span>
            )}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground mt-2">
            v{appInfo.version} · {appInfo.fileSize} · Android {appInfo.minAndroidVersion}+
          </p>
        </section>

        <SectionDivider />

        {/* ── About this app ── */}
        <section className="px-4 sm:px-6 py-5">
          <SectionHeader icon={Smartphone} title="About this app" />
          <div className={cn(
            "text-sm text-foreground/90 whitespace-pre-line leading-relaxed",
            !isDescriptionExpanded && "line-clamp-5"
          )}>
            {appInfo.description}
          </div>
          {needsExpand && (
            <button
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="flex items-center gap-1 text-primary text-sm font-medium mt-2 hover:opacity-80 transition-opacity"
              data-testid="button-expand-description"
            >
              {isDescriptionExpanded ? (
                <><ChevronUp size={16} /> Show less</>
              ) : (
                <><ChevronDown size={16} /> Read more</>
              )}
            </button>
          )}
        </section>

        <SectionDivider />

        {/* ── Tags ── */}
        <section className="px-4 sm:px-6 py-5">
          <SectionHeader icon={Tag} title="Tags" />
          <div className="flex flex-wrap gap-2">
            {appInfo.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/50"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        <SectionDivider />

        {/* ── What's New ── */}
        <section className="px-4 sm:px-6 py-5">
          <SectionHeader icon={Info} title="What's new" />
          <p className="text-xs text-muted-foreground mb-2">
            Version {appInfo.version} · {new Date(appInfo.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
          <p className="text-sm whitespace-pre-line leading-relaxed text-foreground/90">
            {appInfo.whatsNew}
          </p>
        </section>

        <SectionDivider />

        {/* ── App Info ── */}
        <section className="px-4 sm:px-6 py-5">
          <SectionHeader icon={Info} title="App details" />
          <div className="divide-y divide-border/60">
            {[
              { label: "Version", value: appInfo.version },
              { label: "Updated", value: new Date(appInfo.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
              { label: "Released", value: new Date(appInfo.releasedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
              { label: "Requires Android", value: `Android ${appInfo.minAndroidVersion} (SDK 24, Nougat) and up` },
              { label: "Target Android", value: appInfo.targetAndroidVersion },
              { label: "Category", value: appInfo.category },
              { label: "Content rating", value: appInfo.contentRating },
              { label: "File size", value: appInfo.fileSize },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-3 gap-4">
                <span className="text-sm text-muted-foreground shrink-0">{label}</span>
                <span className="text-sm font-medium text-right break-all">{value}</span>
              </div>
            ))}
          </div>
        </section>

        <SectionDivider />

        {/* ── Permissions ── */}
        <section className="px-4 sm:px-6 py-5">
          <SectionHeader icon={Lock} title="Permissions" />
          <div className={cn("space-y-2", !isPermissionsExpanded && "")}>
            {(isPermissionsExpanded
              ? appInfo.permissions
              : appInfo.permissions.slice(0, 4)
            ).map((perm) => (
              <div key={perm} className="flex items-center gap-2 text-sm text-foreground/80">
                <Shield size={14} className="text-muted-foreground shrink-0" />
                {perm}
              </div>
            ))}
          </div>
          {appInfo.permissions.length > 4 && (
            <button
              onClick={() => setIsPermissionsExpanded(!isPermissionsExpanded)}
              className="flex items-center gap-1 text-primary text-sm font-medium mt-3 hover:opacity-80 transition-opacity"
              data-testid="button-expand-permissions"
            >
              {isPermissionsExpanded ? (
                <><ChevronUp size={16} /> Show fewer</>
              ) : (
                <><ChevronDown size={16} /> See all {appInfo.permissions.length} permissions</>
              )}
            </button>
          )}
        </section>

        <SectionDivider />

        {/* ── Ratings & Reviews ── */}
        <section className="px-4 sm:px-6 py-5">
          <SectionHeader icon={Star} title="Ratings & reviews" />

          {isSummaryLoading || !ratingsSummary ? (
            <Skeleton className="h-32 w-full rounded-xl" />
          ) : (
            <div className="flex gap-5 items-center mb-6">
              {/* Big score */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <span className="text-5xl font-bold tracking-tight leading-none">
                  {ratingsSummary.totalRatings > 0
                    ? ratingsSummary.averageRating.toFixed(1)
                    : "—"}
                </span>
                <Stars rating={ratingsSummary.averageRating} size={16} />
                <span className="text-xs text-muted-foreground">
                  {formatNumber(ratingsSummary.totalRatings)}
                </span>
              </div>

              {/* Bar chart */}
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count =
                    ratingsSummary.breakdown[
                      star.toString() as keyof typeof ratingsSummary.breakdown
                    ] ?? 0;
                  const pct =
                    ratingsSummary.totalRatings > 0
                      ? (count / ratingsSummary.totalRatings) * 100
                      : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-2 shrink-0">{star}</span>
                      <Progress value={pct} className="h-2 flex-1" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Write a review */}
          <div className="bg-muted/40 rounded-2xl p-4 mb-6 border border-border/50">
            <h3 className="text-sm font-semibold mb-1">Rate this app</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Tell others what you think — no account needed
            </p>

            {reviewSubmitted ? (
              <div className="text-center py-4">
                <p className="text-sm font-medium text-primary">Your review has been submitted!</p>
                <button
                  onClick={() => setReviewSubmitted(false)}
                  className="text-xs text-muted-foreground mt-2 underline"
                >
                  Write another
                </button>
              </div>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmitReview)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="stars"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RatingStarPicker
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="userName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Your name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. John Doe"
                            className="h-10 text-sm bg-background"
                            data-testid="input-username"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reviewText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Your review</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Share your experience with this app..."
                            className="resize-none h-24 text-sm bg-background"
                            data-testid="input-review"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full rounded-full h-10 text-sm font-semibold"
                    disabled={submitRating.isPending}
                    data-testid="button-submit-review"
                  >
                    {submitRating.isPending ? "Submitting..." : "Submit review"}
                  </Button>
                </form>
              </Form>
            )}
          </div>

          {/* Review list */}
          {isRatingsLoading || !ratingsData ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex gap-3 items-center">
                    <Skeleton className="w-9 h-9 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : ratingsData.ratings.length === 0 ? (
            <div className="text-center py-8">
              <Star size={32} className="mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
              <p className="text-xs text-muted-foreground">Be the first to rate this app!</p>
            </div>
          ) : (
            <div>
              {ratingsData.ratings.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </section>

        <SectionDivider />

        {/* ── Footer ── */}
        <footer className="px-4 sm:px-6 py-8 text-center space-y-1">
          <p className="text-xs text-muted-foreground font-medium">
            © {new Date().getFullYear()} Elite eSports. All rights reserved.
          </p>
        </footer>

      </div>
    </div>
  );
}
