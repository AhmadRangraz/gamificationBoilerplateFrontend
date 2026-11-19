export interface paths {
    "/api/v1/assistant/conversations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listConversations"];
        put?: never;
        post: operations["create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/assistant/conversations/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["history"];
        put?: never;
        post?: never;
        delete: operations["removeConversation"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/assistant/conversations/{id}/turns": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["message"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/accounts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listAccounts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/accounts/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["setAccountStatus"];
        trace?: never;
    };
    "/api/v1/auth/email/request": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["requestEmailVerification"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/email/verify": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["verifyEmail"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getProfile"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["updateProfile"];
        trace?: never;
    };
    "/api/v1/auth/me/avatar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getAvatar"];
        put: operations["saveAvatar"];
        post?: never;
        delete: operations["deleteAvatar"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/password/request": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["requestPasswordReset"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/password/reset": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["resetPassword"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["register"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/booking": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["bookingDashboard"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/booking/appointments/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["status"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/booking/services": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["offer"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/booking/services/{id}/slots": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["slot"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/booking/slots/{id}/reserve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["reserve"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/community": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["feed"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/community/posts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["publish"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/community/posts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["removePost"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/community/posts/{id}/comments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["comment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/community/posts/{id}/reaction": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["react"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/gamification/accounts/{id}/adjustments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["grantAdjustment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/gamification/admin": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["report"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/gamification/admin/controls": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["configure"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/gamification/admin/ranking/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["moderate"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/gamification/engagement": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["read"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/gamification/engagement/challenge/claim": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["claim"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/gamification/engagement/challenge/join": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["join"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/gamification/engagement/goal": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["goal"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/gamification/engagement/referral": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["apply"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/gamification/engagement/referral/{id}/claim": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["claimReferral"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/gamification/engagement/streak": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["protectStreak"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/gamification/leaderboard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["leaderboard"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/gamification/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getMyProgress"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/gamification/preferences": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["setRankingPreference"];
        trace?: never;
    };
    "/api/v1/gamification/rewards": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/gamification/rewards/redemptions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["redeem"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getHealth"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/learning": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["courses"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/learning/lessons/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["lesson"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/learning/lessons/{id}/complete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["complete"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/marketplace/favorites": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getFavoriteListings"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/marketplace/favorites/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getFavoriteState"];
        put: operations["saveFavoriteListing"];
        post?: never;
        delete: operations["deleteFavoriteListing"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/marketplace/listings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["browseListings"];
        put?: never;
        post: operations["createListing"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/marketplace/listings/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getListing"];
        put?: never;
        post?: never;
        delete: operations["deleteListing"];
        options?: never;
        head?: never;
        patch: operations["updateListing"];
        trace?: never;
    };
    "/api/v1/marketplace/mine": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getOwnedListings"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workspaces": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listWorkspaces"];
        put?: never;
        post: operations["createWorkspace"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workspaces/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["deleteWorkspace"];
        options?: never;
        head?: never;
        patch: operations["updateWorkspace"];
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        AccountCodeDto: {
            code: string;
        };
        AccountResponse: {
            /** Format: email */
            email: string;
            emailVerified: boolean;
            /** Format: uuid */
            id: string;
            name: string;
            /** @enum {string} */
            role: "MEMBER" | "ADMIN";
            /** Format: date-time */
            suspendedAt: string | null;
        };
        AccountStatusDto: {
            suspended: boolean;
        };
        AchievementResponse: {
            current: number;
            /** @enum {string} */
            kind: "ACTIVITY" | "XP";
            target: number;
            unlocked: boolean;
        };
        AdjustmentInput: {
            points: number;
            reason: string;
            /** Format: uuid */
            requestId: string;
        };
        AdminReport: {
            audit: components["schemas"]["AuditView"][];
            cappedEvents: number;
            capSignals: components["schemas"]["CapSignal"][];
            challengeEntries: number;
            controls: components["schemas"]["ControlInput"][];
            participants: number;
            rewardRedemptions: number;
            verifiedReferrals: number;
        };
        AppointmentView: {
            /** Format: uuid */
            id: string;
            provider: boolean;
            service: string;
            /** Format: date-time */
            startsAt: string;
            /** @enum {string} */
            status: "REQUESTED" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
        };
        AuditView: {
            actorId: string;
            /** Format: date-time */
            createdAt: string;
            key: string;
            value: number;
        };
        AvatarDto: {
            /** Format: byte */
            image: string;
        };
        BookingView: {
            appointments: components["schemas"]["AppointmentView"][];
            services: components["schemas"]["ServiceView"][];
        };
        CapSignal: {
            accountId: string;
            count: number;
        };
        ChallengeLeader: {
            count: number;
            name: string;
        };
        ChallengeView: {
            claimable: boolean;
            claimed: boolean;
            current: number;
            endsAt: string;
            /** @enum {string} */
            event: "EMAIL_VERIFIED" | "LISTING_PUBLISHED" | "POST_PUBLISHED" | "LESSON_COMPLETED";
            joined: boolean;
            leaders: components["schemas"]["ChallengeLeader"][];
            /** @enum {string} */
            mode: "individual" | "group";
            startsAt: string;
            /** @enum {string} */
            status: "UPCOMING" | "ACTIVE" | "EXPIRED";
            target: number;
            title: string;
        };
        CommentInput: {
            body: string;
        };
        CommentView: {
            author: string;
            body: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            id: string;
        };
        ConfiguredBadge: {
            /** @enum {string} */
            category: "activity" | "xp";
            current: number;
            key: string;
            /** @enum {string} */
            rarity: "common" | "rare" | "epic";
            target: number;
            title: string;
            unlocked: boolean;
        };
        ControlInput: {
            key: string;
            value: number;
        };
        ConversationInput: {
            title: string;
        };
        ConversationView: {
            /** Format: uuid */
            id: string;
            title: string;
        };
        CourseView: {
            description: string;
            /** Format: uuid */
            id: string;
            lessons: components["schemas"]["LessonView"][];
            title: string;
        };
        CredentialsDto: {
            /** Format: email */
            email: string;
            /** Format: password */
            password: string;
        };
        EmailDto: {
            /** Format: email */
            email: string;
        };
        EngagementView: {
            challenge: components["schemas"]["ChallengeView"] | null;
            goal: components["schemas"]["GoalView"] | null;
            referral: components["schemas"]["ReferralStatus"] | null;
            streakProtectionCost: number | null;
        };
        FavoriteState: {
            saved: boolean;
        };
        FeedView: {
            hasNext: boolean;
            notifications: components["schemas"]["SocialNotice"][];
            posts: components["schemas"]["PostView"][];
        };
        GoalInput: {
            target: number;
        };
        GoalView: {
            current: number;
            target: number;
        };
        HealthResponse: {
            /** @enum {string} */
            database: "ready" | "unavailable";
            /** @enum {string} */
            status: "ready" | "unavailable";
        };
        LessonDetail: {
            body: string;
            completed: boolean;
            /** Format: uuid */
            id: string;
            title: string;
        };
        LessonView: {
            completed: boolean;
            /** Format: uuid */
            id: string;
            title: string;
        };
        ListingInput: {
            /** @enum {string} */
            category: "HANDMADE" | "BOOKS" | "ELECTRONICS";
            description: string;
            price: number;
            title: string;
        };
        ListingPage: {
            hasNext: boolean;
            items: components["schemas"]["ListingResponse"][];
        };
        ListingResponse: {
            /** @enum {string} */
            category: "HANDMADE" | "BOOKS" | "ELECTRONICS";
            /** Format: date-time */
            createdAt: string;
            description: string;
            /** Format: uuid */
            id: string;
            price: number;
            sellerName: string;
            title: string;
        };
        MissionResponse: {
            completed: boolean;
            points: number;
            steps: components["schemas"]["MissionStepResponse"][];
            title: string;
            xp: number;
        };
        MissionStepResponse: {
            current: number;
            /** @enum {string} */
            event: "EMAIL_VERIFIED" | "LISTING_PUBLISHED" | "POST_PUBLISHED" | "LESSON_COMPLETED";
            /** @enum {string} */
            status: "LOCKED" | "ACTIVE" | "COMPLETED";
            target: number;
        };
        PointEntryResponse: {
            /** Format: date-time */
            createdAt: string;
            /** @enum {string} */
            event: "ADMIN_ADJUSTMENT" | "EMAIL_VERIFIED" | "LISTING_PUBLISHED" | "QUEST_COMPLETED" | "MISSION_COMPLETED" | "REWARD_REDEEMED" | "CHALLENGE_COMPLETED" | "REFERRAL_COMPLETED" | "POST_PUBLISHED" | "LESSON_COMPLETED" | "STREAK_PROTECTED";
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            outcome: "AWARDED" | "CAPPED";
            points: number;
            xp: number;
        };
        PostInput: {
            body: string;
        };
        PostView: {
            author: string;
            body: string;
            comments: components["schemas"]["CommentView"][];
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            id: string;
            mine: boolean;
            reacted: boolean;
            reactionCount: number;
        };
        ProfileDto: {
            name: string;
        };
        ProgressResponse: {
            achievements: components["schemas"]["AchievementResponse"][];
            badges: components["schemas"]["ConfiguredBadge"][];
            daily: components["schemas"]["StreakResponse"];
            leaderboardOptIn: boolean;
            ledger: components["schemas"]["PointEntryResponse"][];
            level: number;
            levelStartAt: number;
            mission: components["schemas"]["MissionResponse"] | null;
            nextLevelAt: number | null;
            points: number;
            quest: components["schemas"]["QuestResponse"] | null;
            recentDays: components["schemas"]["StreakDayResponse"][];
            rewardDiscount: number;
            weekly: components["schemas"]["StreakResponse"];
            xp: number;
        };
        QuestResponse: {
            /** @enum {string} */
            cadence: "once" | "daily" | "weekly";
            current: number;
            /** Format: date */
            day: string | null;
            /** Format: date-time */
            endsAt: string | null;
            /** @enum {string} */
            event: "EMAIL_VERIFIED" | "LISTING_PUBLISHED" | "POST_PUBLISHED" | "LESSON_COMPLETED";
            points: number;
            /** Format: date-time */
            startsAt: string | null;
            /** @enum {string} */
            status: "UPCOMING" | "ACTIVE" | "COMPLETED" | "EXPIRED";
            target: number;
            title: string;
            xp: number;
        };
        RankingModeration: {
            excluded: boolean;
        };
        RankingPage: {
            hasNext: boolean;
            myRank: number | null;
            rows: components["schemas"]["RankingRow"][];
        };
        RankingPreference: {
            leaderboardOptIn: boolean;
        };
        RankingRow: {
            isMe: boolean;
            name: string;
            rank: number;
            xp: number;
        };
        ReactionInput: {
            active: boolean;
        };
        RedemptionInput: {
            /** Format: uuid */
            requestId: string;
            rewardKey: string;
        };
        RedemptionResponse: {
            cost: number;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            id: string;
            rewardKey: string;
            title: string;
        };
        ReferralInput: {
            /** Format: uuid */
            code: string;
        };
        ReferralStatus: {
            canApply: boolean;
            code: string;
            qualified: components["schemas"]["ReferralView"][];
        };
        ReferralView: {
            /** Format: uuid */
            accountId: string;
            claimed: boolean;
        };
        RegisterDto: {
            /** Format: email */
            email: string;
            name: string;
            /** Format: password */
            password: string;
        };
        ResetPasswordDto: {
            code: string;
            /** Format: password */
            password: string;
        };
        RewardItemResponse: {
            cost: number;
            description: string;
            key: string;
            title: string;
        };
        RewardsResponse: {
            balance: number;
            redemptions: components["schemas"]["RedemptionResponse"][];
            rewards: components["schemas"]["RewardItemResponse"][];
        };
        ServiceInput: {
            description: string;
            title: string;
        };
        ServiceView: {
            description: string;
            /** Format: uuid */
            id: string;
            mine: boolean;
            provider: string;
            slots: components["schemas"]["SlotView"][];
            title: string;
        };
        SlotInput: {
            /** Format: date-time */
            startsAt: string;
        };
        SlotView: {
            /** Format: uuid */
            id: string;
            /** Format: date-time */
            startsAt: string;
        };
        SocialNotice: {
            actor: string;
            /** Format: date-time */
            createdAt: string;
            /** @enum {string} */
            kind: "COMMENT" | "REACTION";
        };
        StatusInput: {
            /** @enum {string} */
            status: "CONFIRMED" | "CANCELLED" | "COMPLETED";
        };
        StreakDayResponse: {
            active: boolean;
            /** Format: date */
            day: string;
        };
        StreakInput: {
            /** @enum {string} */
            mode: "freeze" | "recover";
        };
        StreakResponse: {
            current: number;
            longest: number;
        };
        TurnInput: {
            prompt: string;
            /** Format: uuid */
            requestId: string;
        };
        TurnView: {
            /** Format: uuid */
            id: string;
            prompt: string;
            reply: string;
            topic: string;
        };
        WorkspaceInput: {
            name: string;
            slug: string;
        };
        WorkspacePage: {
            hasNext: boolean;
            items: components["schemas"]["WorkspaceResponse"][];
        };
        WorkspaceResponse: {
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            id: string;
            name: string;
            slug: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    listConversations: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConversationView"][];
                };
            };
        };
    };
    create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConversationInput"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConversationView"];
                };
            };
        };
    };
    history: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TurnView"][];
                };
            };
        };
    };
    removeConversation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    message: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TurnInput"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/x-ndjson": string;
                };
            };
        };
    };
    listAccounts: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountResponse"][];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    setAccountStatus: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AccountStatusDto"];
            };
        };
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    requestEmailVerification: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    verifyEmail: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AccountCodeDto"];
            };
        };
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CredentialsDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountResponse"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    logout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getProfile: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountResponse"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    updateProfile: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProfileDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountResponse"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getAvatar: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "image/png": string;
                };
            };
        };
    };
    saveAvatar: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AvatarDto"];
            };
        };
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    deleteAvatar: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    requestPasswordReset: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailDto"];
            };
        };
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    resetPassword: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ResetPasswordDto"];
            };
        };
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    register: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RegisterDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountResponse"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    bookingDashboard: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingView"];
                };
            };
        };
    };
    status: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StatusInput"];
            };
        };
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    offer: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ServiceInput"];
            };
        };
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    slot: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SlotInput"];
            };
        };
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    reserve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    feed: {
        parameters: {
            query?: {
                page?: Record<string, never>;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FeedView"];
                };
            };
        };
    };
    publish: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PostInput"];
            };
        };
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    removePost: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    comment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CommentInput"];
            };
        };
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    react: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReactionInput"];
            };
        };
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    grantAdjustment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AdjustmentInput"];
            };
        };
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    report: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminReport"];
                };
            };
        };
    };
    configure: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ControlInput"];
            };
        };
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    moderate: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RankingModeration"];
            };
        };
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    read: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EngagementView"];
                };
            };
        };
    };
    claim: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    join: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    goal: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GoalInput"];
            };
        };
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    apply: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReferralInput"];
            };
        };
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    claimReferral: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    protectStreak: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StreakInput"];
            };
        };
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    leaderboard: {
        parameters: {
            query?: {
                page?: Record<string, never>;
                period?: "daily" | "weekly" | "monthly" | "all" | "season";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RankingPage"];
                };
            };
        };
    };
    getMyProgress: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProgressResponse"];
                };
            };
        };
    };
    setRankingPreference: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RankingPreference"];
            };
        };
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    list: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RewardsResponse"];
                };
            };
        };
    };
    redeem: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RedemptionInput"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RedemptionResponse"];
                };
            };
        };
    };
    getHealth: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthResponse"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthResponse"];
                };
            };
        };
    };
    courses: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CourseView"][];
                };
            };
        };
    };
    lesson: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LessonDetail"];
                };
            };
        };
    };
    complete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getFavoriteListings: {
        parameters: {
            query?: {
                page?: Record<string, never>;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListingPage"];
                };
            };
        };
    };
    getFavoriteState: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FavoriteState"];
                };
            };
        };
    };
    saveFavoriteListing: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    deleteFavoriteListing: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    browseListings: {
        parameters: {
            query?: {
                category?: "HANDMADE" | "BOOKS" | "ELECTRONICS";
                page?: Record<string, never>;
                q?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListingPage"];
                };
            };
        };
    };
    createListing: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ListingInput"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListingResponse"];
                };
            };
        };
    };
    getListing: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListingResponse"];
                };
            };
        };
    };
    deleteListing: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    updateListing: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ListingInput"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListingResponse"];
                };
            };
        };
    };
    getOwnedListings: {
        parameters: {
            query?: {
                page?: Record<string, never>;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListingPage"];
                };
            };
        };
    };
    listWorkspaces: {
        parameters: {
            query?: {
                page?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspacePage"];
                };
            };
        };
    };
    createWorkspace: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkspaceInput"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceResponse"];
                };
            };
        };
    };
    deleteWorkspace: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    updateWorkspace: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkspaceInput"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceResponse"];
                };
            };
        };
    };
}
