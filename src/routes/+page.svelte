<script>
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { supabase } from "$lib/supabaseClient";

	// iTunes Search API — free, no key, CORS enabled
	const ITUNES = "https://itunes.apple.com/search";

	const OTT_PLATFORMS = [
		{ id: "all", name: "All Platforms", color: "#e50914", logo: "🎬" },
		{ id: "netflix", name: "Netflix", color: "#e50914", logoImg: "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg" },
		{ id: "prime", name: "Prime Video", color: "#00a8e1", logoImg: "https://upload.wikimedia.org/wikipedia/commons/1/11/Amazon_Prime_Video_logo.svg" },
		{ id: "hotstar", name: "Hotstar", color: "#1f80e0", logoImg: "https://upload.wikimedia.org/wikipedia/commons/1/1e/Disney%2B_Hotstar_logo.svg" },
		{ id: "jio", name: "JioCinema", color: "#6c3bd5", logoImg: "https://upload.wikimedia.org/wikipedia/commons/a/ac/JioCinema_logo.svg" },
		{ id: "apple", name: "Apple TV+", color: "#888", logoImg: "https://upload.wikimedia.org/wikipedia/commons/2/28/Apple_TV_Plus_Logo.svg" },
	];
	const OTT_WATCH_URLS = {
		netflix: (t) =>
			`https://www.netflix.com/search?q=${encodeURIComponent(t)}`,
		prime: (t) =>
			`https://www.primevideo.com/search/?phrase=${encodeURIComponent(t)}`,
		hotstar: (t) =>
			`https://www.hotstar.com/in/search?q=${encodeURIComponent(t)}`,
		jio: (t) =>
			`https://www.jiocinema.com/search?q=${encodeURIComponent(t)}`,
		apple: (t) =>
			`https://tv.apple.com/search?term=${encodeURIComponent(t)}`,
	};

	let user = $state(null);
	let authLoading = $state(true);
	let email = $state("");
	let password = $state("");
	let authError = $state("");
	let authMessage = $state("");
	let showForgotPassword = $state(false);
	let resetEmail = $state("");
	let showPasswordReset = $state(false);
	let newPassword = $state("");
	let confirmPassword = $state("");
	let selectedPlan = $state("");

	// Password visibility toggles
	let showPass = $state(false);
	let showSignupPass = $state(false);
	let showNewPass = $state(false);
	let showConfirmPass = $state(false);

	// Home movie sections (loaded from iTunes)
	let trendingMovies = $state([]);
	let popularMovies = $state([]);
	let picksMovies = $state([]);
	let continueMovies = $state([]);
	let homeLoading = $state(true);

	// Search state
	let searchQuery = $state("");
	let searchResults = $state([]);
	let searching = $state(false);
	let searchOpen = $state(false);
	let activeOTT = $state("all");
	let searchDebounce;

	// Hero State
	let currentHeroIndex = $state(0);
	const heroMovies = [
		{
			title: "Disclosure Day",
			backdrop:
				"https://image.tmdb.org/t/p/original/gVczdWWAkBCuwEV1v9cg7ELfdhT.jpg",
			releaseDate: "2026",
			rating: "13+",
			genre: "Sci-Fi",
			overview:
				"A cybersecurity expert becomes a whistleblower after uncovering secrets about aliens, putting him on the run from a corporation.",
		},
		{
			title: "The Odyssey",
			backdrop:
				"https://image.tmdb.org/t/p/original/r57L2UBLPKcHdZQYg8tagv9XqK2.jpg",
			releaseDate: "2026",
			rating: "13+",
			genre: "Adventure",
			overview:
				"Odysseus embarks on a long and perilous journey home following the Trojan War, forced to confront the whims of gods and monsters.",
		},
		{
			title: "Toy Story 5",
			backdrop:
				"https://image.tmdb.org/t/p/original/qjTqY5coNiz6sVtPng40IzltsoN.jpg",
			releaseDate: "2026",
			rating: "U",
			genre: "Animation",
			overview:
				"When Bonnie receives a new tablet, Buzz, Woody and the gang have to go head to head with the all-new threat to playtime.",
		},
		{
			title: "The Furious",
			backdrop:
				"https://image.tmdb.org/t/p/original/1AVF2fAevpfi2HP6AEpptG1kg8R.jpg",
			releaseDate: "2026",
			rating: "16+",
			genre: "Action",
			overview:
				"After a criminal network kidnaps his daughter, a man sets out on his own to locate her in this explosive martial arts showdown.",
		},
		{
			title: "Obsession",
			backdrop:
				"https://image.tmdb.org/t/p/original/r013C8Me2bZ0pUi0OWJRh0h7MzT.jpg",
			releaseDate: "2026",
			rating: "18+",
			genre: "Thriller",
			overview:
				'After breaking the mysterious "One Wish Willow" to win his crush\'s heart, a hopeless romantic finds himself getting exactly what he asked for.',
		},
	];

	$effect(() => {
		const interval = setInterval(() => {
			currentHeroIndex = (currentHeroIndex + 1) % heroMovies.length;
		}, 8000);
		return () => clearInterval(interval);
	});

	// Play modal
	let playingMovie = $state(null);

	onMount(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			user = session?.user ?? null;
			selectedPlan = user?.user_metadata?.plan ?? "";
			authLoading = false;
			if (user && !selectedPlan) {
				goto("/subscription");
			}
		});
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, session) => {
			if (event === "PASSWORD_RECOVERY") {
				showPasswordReset = true;
				authError = "";
				authMessage = "";
				newPassword = "";
				confirmPassword = "";
			} else {
				user = session?.user ?? null;
				selectedPlan = session?.user?.user_metadata?.plan ?? "";
				if (user && !selectedPlan) {
					goto("/subscription");
				}
			}
		});
		loadHomeMovies();
		return () => subscription.unsubscribe();
	});

	// ── Load 100 movies for home page using TMDB ──
	import { allMovies } from "../movies.js";

	async function loadHomeMovies() {
		homeLoading = true;
		try {
			// Distribute the movies across the 4 rows (10 each for main page)
			trendingMovies = allMovies
				.slice(0, 10)
				.map((m, i) => ({
					...m,
					rank: String(i + 1).padStart(2, "0"),
				}));
			popularMovies = allMovies.slice(10, 20);
			picksMovies = allMovies.slice(20, 30);
			continueMovies = allMovies
				.slice(30, 40)
				.map((m, i) => ({
					...m,
					progress: Math.floor(Math.random() * 80) + 10,
				}));
		} catch (e) {
			console.error("Local load error:", e);
		}
		homeLoading = false;
	}

	// ── Helpers ──
	function posterUrl(m) {
		if (!m?.artworkUrl100) return "";
		return m.artworkUrl100.replace("100x100bb", "500x750bb");
	}

	function watchLink(title) {
		return `https://www.youtube.com/results?search_query=${encodeURIComponent(title + " full movie")}`;
	}

	// ── Auth functions ──

	async function signIn() {
		authError = "";
		authMessage = "";
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		if (error) authError = error.message;
	}

	async function signUp() {
		authError = "";
		authMessage = "";
		const { error } = await supabase.auth.signUp({ email, password });
		if (error) authError = error.message;
		else
			authMessage =
				"Check your email to confirm your account, then sign in.";
	}

	async function forgotPassword() {
		authError = "";
		authMessage = "";
		if (!resetEmail) {
			authError = "Please enter your email address.";
			return;
		}
		const { error } = await supabase.auth.resetPasswordForEmail(
			resetEmail,
			{
				redirectTo: window.location.href,
			},
		);
		if (error) authError = error.message;
		else authMessage = "Password reset link sent! Check your inbox.";
	}

	function openForgotPassword() {
		showForgotPassword = true;
		resetEmail = email;
		authError = "";
		authMessage = "";
	}

	function closeForgotPassword() {
		showForgotPassword = false;
		authError = "";
		authMessage = "";
	}

	async function updatePassword() {
		authError = "";
		authMessage = "";
		if (!newPassword || newPassword.length < 6) {
			authError = "Password must be at least 6 characters.";
			return;
		}
		if (newPassword !== confirmPassword) {
			authError = "Passwords do not match.";
			return;
		}
		const { error } = await supabase.auth.updateUser({
			password: newPassword,
		});
		if (error) authError = error.message;
		else {
			authMessage = "Password updated! Signing you in…";
			showPasswordReset = false;
			newPassword = "";
			confirmPassword = "";
		}
	}

	async function choosePlan(plan) {
		const { data, error } = await supabase.auth.updateUser({
			data: { plan },
		});
		if (error) authError = error.message;
		else {
			user = data.user;
			selectedPlan = plan;
		}
	}

	async function signOut() {
		await supabase.auth.signOut();
		email = "";
		password = "";
		selectedPlan = "";
	}

	async function searchMovies(query) {
		if (!query.trim()) {
			searchResults = [];
			return;
		}
		searching = true;
		try {
			const res = await fetch(
				`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=movie&entity=movie&limit=15`,
			);
			const data = await res.json();

			// Search our local high-quality database as well, since iTunes misses many non-Western/Indian movies!
			const localResults = allMovies.filter((m) =>
				m.trackName.toLowerCase().includes(query.toLowerCase()),
			);
			const itunesResults = data.results || [];

			// Combine, putting local results first and removing duplicates by title
			const combined = [...localResults];
			for (const movie of itunesResults) {
				if (
					!combined.find(
						(m) =>
							m.trackName.toLowerCase() ===
							movie.trackName.toLowerCase(),
					)
				) {
					combined.push(movie);
				}
			}

			searchResults = combined;
		} catch (e) {
			console.error("Search failed:", e);
			// Fallback to purely local search if offline/blocked
			searchResults = allMovies.filter((m) =>
				m.trackName.toLowerCase().includes(query.toLowerCase()),
			);
		}
		searching = false;
	}

	function onSearchInput(e) {
		searchQuery = e.target.value;
		clearTimeout(searchDebounce);
		if (searchQuery.length > 1)
			searchDebounce = setTimeout(() => searchMovies(searchQuery), 380);
		else searchResults = [];
	}

	function openSearch() {
		searchOpen = true;
		setTimeout(() => document.getElementById("main-search")?.focus(), 60);
	}
	function closeSearch() {
		searchOpen = false;
		searchQuery = "";
		searchResults = [];
	}

	function openPlayer(movie) {
		playingMovie = movie;
	}
	function closePlayer() {
		playingMovie = null;
	}

	function ottLink(title, platformId) {
		const fn = OTT_WATCH_URLS[platformId];
		return fn
			? fn(title)
			: `https://www.google.com/search?q=watch+${encodeURIComponent(title)}+online+streaming`;
	}

	function filteredResults() {
		return searchResults;
	}
</script>

<svelte:head>
	<title>Streamly — Unlimited stories</title>
	<meta
		name="description"
		content="A cinematic streaming landing page built with SvelteKit."
	/>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link
		rel="preconnect"
		href="https://fonts.gstatic.com"
		crossorigin="anonymous"
	/>
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{#if authLoading}
	<section class="auth-screen loading-screen">
		<a class="brand auth-brand" href="/">STREAMLY</a>
		<p>Loading your account…</p>
	</section>
{:else if showPasswordReset}
	<section class="auth-screen">
		<header class="auth-header">
			<a class="brand auth-brand" href="/">STREAMLY</a>
		</header>
		<div class="auth-card">
			<div class="auth-kicker"><span></span> SET NEW PASSWORD</div>
			<h1>New<br />password.</h1>
			<p>Choose a strong new password for your account.</p>
			<form
				class="reset-password-form"
				onsubmit={(e) => {
					e.preventDefault();
					updatePassword();
				}}
			>
				<label for="new-password">New Password</label>
				<input
					id="new-password"
					type="password"
					autocomplete="new-password"
					placeholder="Min. 6 characters"
					bind:value={newPassword}
					required
					minlength="6"
				/>
				<label for="confirm-password">Confirm Password</label>
				<input
					id="confirm-password"
					type="password"
					autocomplete="new-password"
					placeholder="Re-enter your password"
					bind:value={confirmPassword}
					required
					minlength="6"
				/>
				{#if authError}<p class="auth-error">{authError}</p>{/if}
				{#if authMessage}<p class="auth-message">{authMessage}</p>{/if}
				<button type="submit">Update Password</button>
			</form>
		</div>
	</section>
{:else if !user}
	<section class="auth-screen">
		<a class="brand auth-brand" href="/">STREAMLY</a>
		<div class="auth-modal">
			<!-- Right form panel -->
			<div class="auth-form-panel">
				{#if showForgotPassword}
					<div class="form-header">
						<div class="form-icon">🔑</div>
						<h3>Reset Password</h3>
						<p>We'll send a reset link to your inbox.</p>
					</div>
					<form
						class="auth-form"
						onsubmit={(e) => {
							e.preventDefault();
							forgotPassword();
						}}
					>
						<div class="field">
							<label for="reset-email">Email address</label>
							<input
								id="reset-email"
								type="email"
								autocomplete="email"
								placeholder="you@example.com"
								bind:value={resetEmail}
								required
							/>
						</div>
						{#if authError}<p class="auth-error">
								{authError}
							</p>{/if}
						{#if authMessage}<p class="auth-message">
								{authMessage}
							</p>{/if}
						<button class="btn-primary" type="submit"
							>Send Reset Link</button
						>
						<button
							class="btn-ghost"
							type="button"
							onclick={closeForgotPassword}
							>← Back to Sign In</button
						>
					</form>
				{:else}
					<div class="form-header">
						<h3>Welcome back</h3>
						<p>Sign in to your account to continue watching.</p>
					</div>
					<div class="auth-tabs">
						<button
							class="auth-tab active"
							id="tab-signin"
							type="button"
							onclick={(e) => {
								e.currentTarget
									.closest(".auth-tabs")
									.querySelector(".auth-tab")
									.classList.add("active");
								e.currentTarget
									.closest(".auth-tabs")
									.querySelectorAll(".auth-tab")[1]
									.classList.remove("active");
								document.getElementById(
									"signup-form",
								).style.display = "none";
								document.getElementById(
									"signin-form",
								).style.display = "grid";
							}}>Sign In</button
						>
						<button
							class="auth-tab"
							id="tab-signup"
							type="button"
							onclick={(e) => {
								e.currentTarget
									.closest(".auth-tabs")
									.querySelectorAll(".auth-tab")[0]
									.classList.remove("active");
								e.currentTarget.classList.add("active");
								document.getElementById(
									"signin-form",
								).style.display = "none";
								document.getElementById(
									"signup-form",
								).style.display = "grid";
							}}>Create Account</button
						>
					</div>
					<!-- Sign In form -->
					<form
						id="signin-form"
						class="auth-form"
						onsubmit={(e) => {
							e.preventDefault();
							signIn();
						}}
					>
						<div class="field">
							<label for="email">Email</label>
							<input
								id="email"
								type="email"
								autocomplete="email"
								placeholder="you@example.com"
								bind:value={email}
								required
							/>
						</div>
						<div class="field">
							<div class="label-row">
								<label for="password">Password</label>
								<button
									class="forgot-link"
									type="button"
									onclick={openForgotPassword}>Forgot?</button
								>
							</div>
							<div class="pass-wrap">
								<input
									id="password"
									type={showPass ? "text" : "password"}
									autocomplete="current-password"
									placeholder="••••••••"
									bind:value={password}
									required
									minlength="6"
								/>
								<button
									type="button"
									class="eye-btn"
									onclick={() => (showPass = !showPass)}
									aria-label="Toggle visibility"
									>{showPass ? "🙈" : "👁"}</button
								>
							</div>
						</div>
						{#if authError}<p class="auth-error">
								{authError}
							</p>{/if}
						{#if authMessage}<p class="auth-message">
								{authMessage}
							</p>{/if}
						<button class="btn-primary" type="submit"
							>Sign In</button
						>
					</form>
					<!-- Sign Up form (hidden by default) -->
					<form
						id="signup-form"
						class="auth-form"
						style="display:none"
						onsubmit={(e) => {
							e.preventDefault();
							signUp();
						}}
					>
						<div class="field">
							<label for="signup-email">Email</label>
							<input
								id="signup-email"
								type="email"
								autocomplete="email"
								placeholder="you@example.com"
								bind:value={email}
								required
							/>
						</div>
						<div class="field">
							<label for="signup-password">Password</label>
							<div class="pass-wrap">
								<input
									id="signup-password"
									type={showSignupPass ? "text" : "password"}
									autocomplete="new-password"
									placeholder="Min. 6 characters"
									bind:value={password}
									required
									minlength="6"
								/>
								<button
									type="button"
									class="eye-btn"
									onclick={() =>
										(showSignupPass = !showSignupPass)}
									aria-label="Toggle visibility"
									>{showSignupPass ? "🙈" : "👁"}</button
								>
							</div>
						</div>
						{#if authError}<p class="auth-error">
								{authError}
							</p>{/if}
						{#if authMessage}<p class="auth-message">
								{authMessage}
							</p>{/if}
						<button class="btn-primary" type="submit"
							>Create Account</button
						>
					</form>
				{/if}
				<p class="auth-legal">
					By continuing you agree to our <a href="#membership"
						>Terms</a
					>
					&amp; <a href="#membership">Privacy Policy</a>.
				</p>
			</div>
		</div>
	</section>
{:else}
	<main>
		<section class="hero {searchOpen ? 'search-active' : ''}">
			<nav aria-label="Primary navigation">
				<a class="brand" href="/" aria-label="Streamly home">STREAMLY</a
				>
				{#if !searchOpen}
					<div class="browse-links">
						<a href="#home">Home</a><a href="#movies">Movies</a><a
							href="#new">New &amp; Popular</a
						><a href="#list">My List</a>
					</div>
				{/if}
				<div class="nav-actions">
					{#if searchOpen}
						<div class="nav-search-bar">
							<span class="search-ico">⌕</span>
							<input
								id="main-search"
								type="text"
								placeholder="Search movies, shows across Netflix, Prime, Hotstar…"
								value={searchQuery}
								oninput={onSearchInput}
								autocomplete="off"
							/>
							<button
								class="search-close"
								type="button"
								onclick={closeSearch}>✕</button
							>
						</div>
					{:else}
						<button
							class="search"
							type="button"
							aria-label="Search"
							onclick={openSearch}>⌕</button
						>
					{/if}
					<button class="sign-in" type="button" onclick={signOut}
						>Sign Out</button
					>
				</div>
			</nav>

			{#if searchOpen}
				<div class="search-overlay">
					<div class="ott-filters">
						{#each OTT_PLATFORMS as plat}
							<button
								class="ott-pill {activeOTT === plat.id
									? 'active'
									: ''}"
								style="--ott-color:{plat.color}"
								type="button"
								onclick={() => (activeOTT = plat.id)}
							>
								{#if plat.logoImg}
									<img src={plat.logoImg} alt={plat.name} class="ott-logo-img"/>
								{:else}
									<span class="ott-logo">{plat.logo}</span>
									{plat.name}
								{/if}
							</button>
						{/each}
					</div>
					{#if searching}
						<div class="search-status">
							<span class="spinner"></span> Searching…
						</div>
					{:else if searchQuery.length > 1 && filteredResults().length === 0}
						<div class="search-status">
							No results found{activeOTT !== "all"
								? " on this platform"
								: ""}. Try a different search or platform.
						</div>
					{:else if filteredResults().length > 0}
						<div class="search-results-grid">
							{#each filteredResults() as movie}
								<article class="result-card">
									<div class="result-poster">
										{#if movie.artworkUrl100}
											<img
												src={posterUrl(movie)}
												alt={movie.trackName}
												loading="lazy"
											/>
										{:else}
											<div class="no-poster">🎬</div>
										{/if}
										{#if movie.contentAdvisoryRating && movie.contentAdvisoryRating !== "Not Rated"}
											<div class="result-rating">
												{movie.contentAdvisoryRating}
											</div>
										{/if}
									</div>
									<div class="result-info">
										<h4>{movie.trackName}</h4>
										<p class="result-year">
											{movie.releaseDate ? movie.releaseDate.substring(0, 4) : ""}{movie.primaryGenreName
												? ` · ${movie.primaryGenreName}`
												: ""}
										</p>
										<p class="result-overview">
											{(movie.longDescription || movie.overview || "").slice(0, 100) +
													((movie.longDescription || movie.overview || "").length > 100
														? "…"
														: "")}
										</p>
										<div class="result-platforms">
											{#each OTT_PLATFORMS.filter((p) => p.id !== "all") as plat}
												<a
													class="platform-badge {activeOTT ===
													plat.id
														? 'badge-active'
														: ''}"
													style="--ott-color:{plat.color}"
													href={ottLink(
														movie.Title,
														plat.id,
													)}
													target="_blank"
													rel="noreferrer"
													>
													{#if plat.logoImg}
														<img src={plat.logoImg} alt={plat.name} class="plat-badge-img"/>
													{:else}
														{plat.logo} {plat.name}
													{/if}
												</a>
											{/each}
										</div>
									</div>
								</article>
							{/each}
						</div>
					{:else}
						<div class="search-hint">
							<p class="sh-title">🔍 Search any movie or show</p>
							<p class="sh-sub">
								Find where to watch across Netflix, Prime Video,
								Disney+ Hotstar, JioCinema &amp; more — all in
								one place.
							</p>
						</div>
					{/if}
				</div>
			{/if}
				<div class="hero-bg-container">
					{#each heroMovies as hm, i}
						<div
							class="hero-bg {i === currentHeroIndex
								? 'active'
								: ''}"
							style="background-image: url('{hm.backdrop}')"
						></div>
					{/each}
					<div class="hero-vignette"></div>
				</div>

				<div class="hero-content">
					{#key currentHeroIndex}
						<div
							class="hero-text-anim"
							in:fade={{ duration: 1000 }}
						>
							<p class="eyebrow">
								L A T E S T &nbsp; R E L E A S E
							</p>
							<h1>{heroMovies[currentHeroIndex].title}</h1>
							<p class="hero-meta">
								<b>{heroMovies[currentHeroIndex].releaseDate}</b
								><span
									>{heroMovies[currentHeroIndex].rating}</span
								><span
									>{heroMovies[currentHeroIndex].genre}</span
								><span>HD</span>
							</p>
							<p class="hero-copy">
								{heroMovies[currentHeroIndex].overview}
							</p>
							<div class="hero-buttons">
								<a
									class="play-button"
									href={watchLink(
										heroMovies[currentHeroIndex].title,
									)}
									target="_blank"
									rel="noreferrer">▶ &nbsp; Play</a
								>
								<button
									class="info-button"
									onclick={() =>
										openPlayer({
											trackName:
												heroMovies[currentHeroIndex]
													.title,
											overview:
												heroMovies[currentHeroIndex]
													.overview,
											releaseDate:
												heroMovies[currentHeroIndex]
													.releaseDate,
											primaryGenreName:
												heroMovies[currentHeroIndex]
													.genre,
											artworkUrl100: heroMovies[
												currentHeroIndex
											].backdrop.replace(
												"original",
												"w500",
											),
										})}>ⓘ &nbsp; More Info</button
								>
							</div>
							<p class="plan-badge">
								Watching with your {selectedPlan} plan
							</p>
						</div>
					{/key}
				</div>
				<div class="hero-dots">
					{#each heroMovies as _, i}
						<button 
							class="dot {i === currentHeroIndex ? 'active' : ''}" 
							onclick={() => currentHeroIndex = i}
							aria-label="Go to slide {i + 1}"
						></button>
					{/each}
				</div>
		</section>

		<section class="content" id="membership">
			<div class="section-header">
				<h2>Top Picks for You</h2>
				<a href="/category/picks" class="view-all">View all &rarr;</a>
			</div>

			<div class="poster-row" aria-label="Trending titles">
				{#if homeLoading}
					{#each Array(6) as _}
						<div class="poster-card skeleton"></div>
					{/each}
				{:else}
					{#each trendingMovies as show}
						<button
							type="button"
							class="movie-link poster-btn"
							onclick={() => openPlayer(show)}
						>
							<article class="poster-card">
								<img
									src={posterUrl(show)}
									alt={show.trackName}
									loading="lazy"
									decoding="async"
								/>
								<div class="poster-shade"></div>
								<span class="rank">{show.rank}</span>
								<h3>{show.trackName}</h3>
								<div class="card-play-btn">▶</div>
							</article>
						</button>
					{/each}
				{/if}
			</div>

			<section class="shelf" id="movies">
				<div class="section-header">
					<h2>Popular Movies</h2>
					<a href="/category/popular" class="view-all"
						>View all &rarr;</a
					>
				</div>
				<div class="wide-row six-up">
					{#if homeLoading}
						{#each Array(6) as _}<div
								class="wide-card skeleton"
							></div>{/each}
					{:else}
						{#each popularMovies as show}
							<button
								type="button"
								class="movie-link poster-btn"
								onclick={() => openPlayer(show)}
							>
								<article class="wide-card">
									<img
										src={posterUrl(show)}
										alt={show.trackName}
										loading="lazy"
										decoding="async"
									/>
									<div class="wide-card-overlay">
										<span class="wc-play">▶</span>
									</div>
									<h3>{show.trackName}</h3>
								</article>
							</button>
						{/each}
					{/if}
				</div>
			</section>

			<section class="feature-panel">
				<div class="feature-art">
					<span>STREAM<br />WITHOUT<br /><i>LIMITS.</i></span>
				</div>
				<div class="feature-copy">
					<p class="eyebrow">YOUR ENTERTAINMENT, YOUR WAY</p>
					<h2>Watch everywhere.</h2>
					<p>
						Enjoy on your TV, tablet, phone, laptop and more. One
						simple membership gives everyone something to love.
					</p>
					<a class="outline-button" href="/subscription"
						>Explore plans <span>→</span></a
					>
				</div>
			</section>

			<div class="section-header">
				<h2>Trending now</h2>
				<a href="/category/trending" class="view-all">View all &rarr;</a
				>
			</div>
			<div class="wide-row">
				{#if homeLoading}
					{#each Array(5) as _}<div
							class="wide-card skeleton"
						></div>{/each}
				{:else}
					{#each picksMovies as show}
						<button
							type="button"
							class="movie-link poster-btn"
							onclick={() => openPlayer(show)}
						>
							<article class="wide-card">
								<img
									src={posterUrl(show)}
									alt={show.trackName}
									loading="lazy"
									decoding="async"
								/>
								<div class="wide-card-overlay">
									<span class="wc-play">▶</span>
								</div>
								<h3>{show.trackName}</h3>
							</article>
						</button>
					{/each}
				{/if}
			</div>

			<section class="shelf" id="list">
				<div class="section-header">
					<h2>Continue Watching</h2>
					<a href="/category/continue" class="view-all"
						>View all &rarr;</a
					>
				</div>
				<div class="wide-row continue-row">
					{#if homeLoading}
						{#each Array(5) as _}<div
								class="wide-card skeleton"
							></div>{/each}
					{:else}
						{#each continueMovies as show}
							<button
								type="button"
								class="movie-link poster-btn"
								onclick={() => openPlayer(show)}
							>
								<article class="wide-card progress-card">
									<img
										src={posterUrl(show)}
										alt={show.trackName}
										loading="lazy"
										decoding="async"
									/>
									<div class="wide-card-overlay">
										<span class="wc-play">▶</span>
									</div>
									<h3>{show.trackName}</h3>
									<div class="progress">
										<span style={`width: ${show.progress}%`}
										></span>
									</div>
								</article>
							</button>
						{/each}
					{/if}
				</div>
			</section>
		</section>

		<footer>
			<p class="footer-question">Questions? Call 000-800-123-4567</p>
			<div class="footer-links">
				<a href="/footer-links">FAQ</a>
				<a href="/footer-links">Help Centre</a>
				<a href="/footer-links">Account</a>
				<a href="/footer-links">Media Centre</a>
				<a href="/footer-links">Investor Relations</a>
				<a href="/footer-links">Jobs</a>
				<a href="/footer-links">Ways to Watch</a>
				<a href="/footer-links">Terms of Use</a>
				<a href="/footer-links">Privacy</a>
				<a href="/footer-links">Cookie Preferences</a>
				<a href="/footer-links">Corporate Information</a>
				<a href="/footer-links">Contact Us</a>
				<a href="/footer-links">Speed Test</a>
				<a href="/footer-links">Legal Notices</a>
				<a href="/footer-links">Only on Streamly</a>
			</div>
			<button class="language footer-language" type="button"
				>⌄ &nbsp; English</button
			>
			<p class="country">Streamly India</p>
			<p class="made-by">Made by Tushar Singh</p>
		</footer>
	</main>

	<!-- ── Play Modal ── -->
	{#if playingMovie}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="play-modal-backdrop"
			onclick={closePlayer}
			onkeydown={(e) => e.key === "Escape" && closePlayer()}
			role="button"
			tabindex="-1"
			aria-label="Close player"
		>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div
				class="play-modal"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="dialog"
				tabindex="-1"
				aria-label="Movie player"
				aria-modal="true"
			>
				<button
					class="pm-close"
					onclick={closePlayer}
					aria-label="Close">✕</button
				>
				<div class="pm-body">
					<!-- Preview video if available -->
					{#if playingMovie.previewUrl}
						<video
							class="pm-video"
							src={playingMovie.previewUrl}
							controls
							autoplay
							playsinline
						>
							<track kind="captions" />
						</video>
					{:else}
						<div class="pm-no-preview">
							<img
								src={posterUrl(playingMovie)}
								alt={playingMovie.trackName}
							/>
							<div class="pm-no-preview-overlay">
								<span>🎬</span>
								<p>Preview not available</p>
							</div>
						</div>
					{/if}
					<div class="pm-info">
						<div class="pm-meta">
							<h3>{playingMovie.trackName}</h3>
							<div class="pm-tags">
								{#if playingMovie.releaseDate}<span
										>{playingMovie.releaseDate.slice(
											0,
											4,
										)}</span
									>{/if}
								{#if playingMovie.primaryGenreName}<span
										>{playingMovie.primaryGenreName}</span
									>{/if}
								{#if playingMovie.contentAdvisoryRating && playingMovie.contentAdvisoryRating !== "Not Rated"}<span
										class="rating-tag"
										>{playingMovie.contentAdvisoryRating}</span
									>{/if}
							</div>
							<p class="pm-desc">
								{playingMovie.shortDescription ||
									playingMovie.longDescription ||
									""}
							</p>
						</div>
						<div class="pm-watch-on">
							<p class="pm-watch-label">Watch full movie on:</p>
							<div class="pm-platforms">
								{#each OTT_PLATFORMS.filter((p) => p.id !== "all") as plat}
									<a
										class="pm-platform-btn"
										style="--ott-color:{plat.color}"
										href={ottLink(
											playingMovie.trackName,
											plat.id,
										)}
										target="_blank"
										rel="noreferrer"
									>
										{#if plat.logoImg}
											<img src={plat.logoImg} alt={plat.name} class="pm-plat-img"/>
										{:else}
											<span class="pm-plat-logo">{plat.logo}</span>
											{plat.name}
										{/if}
									</a>
								{/each}
								{#if playingMovie.trackViewUrl}
									<a
										class="pm-platform-btn"
										style="--ott-color:#888"
										href={playingMovie.trackViewUrl}
										target="_blank"
										rel="noreferrer"
									>
										<span class="pm-plat-logo">🍎</span> Buy
										/ Rent
									</a>
								{/if}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
{/if}

<style>
	:global(html) {
		scroll-behavior: smooth;
	}
	:global(*) {
		box-sizing: border-box;
	}
	:global(body) {
		margin: 0;
		background: #090909;
		color: #f5f4f1;
		font-family: "Inter", sans-serif;
	}
	:global(button),
	:global(input) {
		font: inherit;
	}
	.auth-screen {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 24px;
		background:
			radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.9) 100%),
			url("https://image.tmdb.org/t/p/original/r57L2UBLPKcHdZQYg8tagv9XqK2.jpg") center/cover;
		position: relative;
	}
	.auth-brand {
		position: absolute;
		top: 32px;
		left: clamp(24px, 5vw, 48px);
		z-index: 10;
		font-size: 2.2rem;
		text-shadow: 0 2px 15px rgba(0,0,0,0.8);
	}
	.auth-modal {
		position: relative;
		display: flex;
		flex-direction: column;
		width: min(450px, 100%);
		border-radius: 16px;
		overflow: hidden;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(24px);
		-webkit-backdrop-filter: blur(24px);
		box-shadow: 0 40px 100px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.1);
	}
	/* Right form panel */
	.auth-form-panel {
		flex: 1;
		padding: 48px 40px 40px;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}
	.form-header {
		margin-bottom: 22px;
	}
	.form-header .form-icon {
		font-size: 1.6rem;
		margin-bottom: 10px;
	}
	.form-header h3 {
		margin: 0 0 6px;
		font-size: 1.25rem;
		font-weight: 700;
		color: #f0f2f5;
		letter-spacing: -0.5px;
	}
	.form-header p {
		margin: 0;
		color: #6e7585;
		font-size: 0.8rem;
		line-height: 1.5;
	}
	/* Tab switcher */
	.auth-tabs {
		display: flex;
		gap: 4px;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 10px;
		padding: 4px;
		margin-bottom: 24px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}
	.auth-tab {
		flex: 1;
		padding: 10px;
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: #8a90a0;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}
	.auth-tab.active {
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
	}
	/* Form fields */
	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.field label,
	.label-row label {
		color: #8a90a0;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.8px;
		text-transform: uppercase;
	}
	.label-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.auth-form input {
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 9px;
		padding: 13px 16px;
		color: #f0f2f5;
		background: rgba(255, 255, 255, 0.08);
		outline: none;
		font-size: 0.95rem;
		transition:
			border-color 0.2s,
			background 0.2s,
			box-shadow 0.2s;
	}
	.auth-form input::placeholder {
		color: rgba(255, 255, 255, 0.2);
	}
	.auth-form input:focus {
		border-color: rgba(229, 9, 20, 0.6);
		background: rgba(255, 255, 255, 0.12);
		box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.15);
	}
	.btn-primary {
		border: 0;
		border-radius: 8px;
		padding: 14px;
		color: #fff;
		background: #e50914;
		cursor: pointer;
		font-weight: 700;
		font-size: 0.95rem;
		letter-spacing: 0.5px;
		transition: all 0.2s ease;
		margin-top: 12px;
	}
	.btn-primary:hover {
		background: #c11119;
	}
	.btn-ghost {
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 9px;
		padding: 11px;
		color: #8a90a0;
		background: transparent;
		cursor: pointer;
		font-weight: 600;
		font-size: 0.82rem;
		transition: all 0.18s;
		text-align: center;
	}
	.btn-ghost:hover {
		border-color: rgba(255, 255, 255, 0.2);
		color: #c5cad4;
		background: rgba(255, 255, 255, 0.05);
	}
	.forgot-link {
		background: none;
		border: none;
		color: #e50914;
		font-size: 0.68rem;
		font-weight: 700;
		cursor: pointer;
		padding: 0;
		transition: opacity 0.18s;
		opacity: 0.8;
	}
	.forgot-link:hover {
		opacity: 1;
		text-decoration: underline;
	}
	.auth-error {
		color: #ff7070;
		font-size: 0.75rem;
		margin: 0;
		padding: 8px 12px;
		background: rgba(255, 100, 100, 0.08);
		border-radius: 7px;
		border: 1px solid rgba(255, 100, 100, 0.15);
	}
	.auth-message {
		color: #5ecc7b;
		font-size: 0.75rem;
		margin: 0;
		padding: 8px 12px;
		background: rgba(80, 200, 100, 0.07);
		border-radius: 7px;
		border: 1px solid rgba(80, 200, 100, 0.15);
	}
	.auth-legal {
		margin: 18px 0 0;
		color: rgba(255, 255, 255, 0.25);
		font-size: 0.62rem;
		line-height: 1.5;
		text-align: center;
	}
	.auth-legal a {
		color: rgba(255, 255, 255, 0.45);
		text-decoration: none;
	}
	.auth-legal a:hover {
		color: #e50914;
	}
	.loading-screen {
		background: #090909;
	}
	.loading-screen p {
		color: #666;
		font-size: 0.85rem;
		margin-top: 12px;
	}
	/* Password reset screen reuses auth-modal layout */
	.reset-password-form {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.reset-password-form label {
		color: #8a90a0;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.8px;
		text-transform: uppercase;
	}
	.reset-password-form input {
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 9px;
		padding: 11px 14px;
		color: #f0f2f5;
		background: rgba(255, 255, 255, 0.06);
		outline: none;
		font-size: 0.88rem;
		transition:
			border-color 0.2s,
			background 0.2s,
			box-shadow 0.2s;
	}
	.reset-password-form input::placeholder {
		color: rgba(255, 255, 255, 0.2);
	}
	.reset-password-form input:focus {
		border-color: rgba(229, 9, 20, 0.5);
		background: rgba(255, 255, 255, 0.09);
		box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.08);
	}
	.reset-password-form button {
		border: 0;
		border-radius: 9px;
		padding: 12px;
		color: #fff;
		background: #e50914;
		cursor: pointer;
		font-weight: 700;
		font-size: 0.88rem;
		transition:
			transform 0.18s,
			background 0.18s,
			box-shadow 0.18s;
		box-shadow: 0 4px 18px rgba(229, 9, 20, 0.35);
	}
	.reset-password-form button:hover {
		background: #f6121d;
		transform: translateY(-1px);
	}

	main {
		overflow: hidden;
	}
	.hero {
		position: relative;
		min-height: 85vh;
		background: #000;
		color: #fff;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		overflow: hidden;
	}

	.hero-bg-container {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 0;
	}

	.hero-bg {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-size: cover;
		background-position: center 20%;
		opacity: 0;
		transition:
			opacity 1s ease-in-out,
			transform 8s linear;
		transform: translateZ(0) scale(1.05);
		will-change: transform, opacity;
		backface-visibility: hidden;
	}

	.hero-bg.active {
		opacity: 1;
		transform: translateZ(0) scale(1);
	}

	.hero-vignette {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(
				to right,
				rgba(0, 0, 0, 0.8) 0%,
				rgba(0, 0, 0, 0.2) 50%,
				rgba(0, 0, 0, 0) 100%
			),
			linear-gradient(
				to top,
				#141414 0%,
				rgba(20, 20, 20, 0) 40%,
				rgba(20, 20, 20, 0.6) 100%
			);
	}

	.hero-content {
		position: relative;
		z-index: 10;
		max-width: 650px;
		margin-top: 15vh;
		padding: 0 4%;
		display: flex;
		flex-direction: column;
	}

	.hero-text-anim {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}
	nav {
		position: relative;
		z-index: 20;
		height: 92px;
		padding: 0 clamp(24px, 6vw, 92px);
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%);
	}
	.brand {
		color: #e50914;
		text-decoration: none;
		font-family: "Outfit", "Inter", sans-serif;
		font-size: 2.2rem;
		font-weight: 900;
		letter-spacing: -1px;
	}
	.browse-links {
		display: flex;
		gap: 24px;
		margin-right: auto;
		margin-left: 50px;
	}
	.browse-links a {
		color: #e5e5e5;
		text-decoration: none;
		font-size: 0.95rem;
		font-weight: 500;
		transition: color 0.2s;
	}
	.browse-links a:first-child,
	.browse-links a:hover {
		color: #fff;
		font-weight: 600;
	}
	.nav-actions {
		display: flex;
		align-items: center;
		gap: 16px;
	}
	.search {
		color: #e5e5e5;
		font-size: 1.8rem;
		line-height: 1;
		background: none;
		border: 0;
		cursor: pointer;
		transition: color 0.2s;
	}
	.search:hover {
		color: #fff;
	}
	.language {
		color: #fff;
		background: rgba(20, 20, 20, 0.65);
		border: 1px solid rgba(255, 255, 255, 0.55);
		border-radius: 4px;
		padding: 8px 12px;
		font-size: 0.8rem;
	}
	.sign-in {
		background: rgba(0, 0, 0, 0.4);
		color: #e5e5e5;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		text-decoration: none;
		padding: 8px 20px;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}
	.sign-in:hover {
		color: #fff;
		border-color: #fff;
		background: rgba(0, 0, 0, 0.8);
	}
	.hero-content {
		margin: 135px 0 0 clamp(24px, 11vw, 172px);
		max-width: 700px;
	}
	.eyebrow {
		color: #e50914;
		letter-spacing: 2.2px;
		font-weight: 700;
		font-size: 0.7rem;
		margin: 0 0 15px;
	}
	h1 {
		font-size: clamp(3.4rem, 7.1vw, 7rem);
		letter-spacing: -5px;
		line-height: 0.83;
		margin: 0;
		max-width: 710px;
	}
	.hero-meta {
		display: flex;
		align-items: center;
		gap: 13px;
		margin: 25px 0 -5px;
		color: #ddd;
		font-size: 0.85rem;
	}
	.hero-meta b {
		color: #48d06c;
	}
	.hero-meta span {
		border: 1px solid #bbb;
		padding: 1px 5px;
		font-size: 0.68rem;
	}
	.hero-meta span:nth-child(3) {
		border: 0;
		padding: 0;
		font-size: 0.85rem;
	}
	.hero-copy {
		color: #d2d0cd;
		max-width: 475px;
		font-size: 1.08rem;
		line-height: 1.55;
		margin: 27px 0;
	}
	.hero-buttons {
		display: flex;
		gap: 10px;
		margin: 27px 0 4px;
	}
	.hero-buttons a {
		border-radius: 4px;
		padding: 12px 22px;
		text-decoration: none;
		font-weight: 700;
	}
	.hero-dots {
		position: absolute;
		bottom: 120px;
		right: clamp(24px, 6vw, 92px);
		display: flex;
		gap: 8px;
		z-index: 20;
	}
	.hero-dots .dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.4);
		border: none;
		cursor: pointer;
		transition: all 0.3s ease;
		padding: 0;
	}
	.hero-dots .dot:hover {
		background: rgba(255, 255, 255, 0.8);
	}
	.hero-dots .dot.active {
		background: #fff;
		width: 24px;
		border-radius: 5px;
	}
	.play-button {
		color: #111;
		background: #fff;
	}
	.info-button {
		color: #fff;
		background: rgba(109, 109, 110, 0.72);
	}
	.outline-button span {
		font-size: 1.4rem;
		vertical-align: -1px;
		margin-left: 4px;
	}

	.content {
		padding: 48px clamp(24px, 6vw, 92px) 105px;
		max-width: 1600px;
		margin: auto;
	}
	.footer-links a:hover {
		color: #e50914;
	}
	.poster-btn {
		background: transparent;
		border: none;
		padding: 0;
		margin: 0;
		display: block;
		width: 100%;
		height: 100%;
		cursor: pointer;
		text-align: left;
		-webkit-appearance: none;
		appearance: none;
	}
	.poster-row {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: minmax(156px, 1fr);
		overflow-x: auto;
		gap: 13px;
		padding-bottom: 8px;
		scrollbar-width: none;
	}
	.poster-row::-webkit-scrollbar {
		display: none;
	}
	.poster-card {
		aspect-ratio: 0.68;
		position: relative;
		overflow: hidden;
		background: #1a1a1a;
	}
	.poster-card img,
	.wide-card img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		transition: transform 0.35s ease;
	}
	.poster-card:hover img,
	.wide-card:hover img {
		transform: scale(1.06);
	}
	.poster-shade {
		position: absolute;
		inset: 0;
		background: linear-gradient(transparent 45%, rgba(0, 0, 0, 0.9));
	}
	.rank {
		position: absolute;
		top: 12px;
		left: 12px;
		font-size: 0.68rem;
		font-weight: 700;
		padding: 5px 7px;
		background: #e50914;
	}
	.poster-card h3 {
		position: absolute;
		z-index: 1;
		bottom: 12px;
		left: 14px;
		right: 12px;
		margin: 0;
		font-size: 0.82rem;
		letter-spacing: 0.5px;
	}
	.shelf {
		margin-top: 70px;
	}

	.six-up {
		grid-template-columns: repeat(6, 1fr);
	}
	.feature-panel {
		background: #171717;
		display: grid;
		grid-template-columns: 1.05fr 1fr;
		margin: 115px 0;
		min-height: 400px;
	}
	.feature-art {
		min-height: 350px;
		display: grid;
		place-items: center;
		background: linear-gradient(135deg, #b00811 0%, #4d0c18 50%, #111 100%);
		position: relative;
		overflow: hidden;
	}
	.feature-art::before,
	.feature-art::after {
		content: "";
		position: absolute;
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: 50%;
		width: 470px;
		height: 470px;
	}
	.feature-art::before {
		transform: translate(-34%, -31%);
	}
	.feature-art::after {
		transform: translate(31%, 34%);
	}
	.feature-art span {
		position: relative;
		z-index: 1;
		font-size: clamp(2.3rem, 4vw, 4.8rem);
		font-weight: 800;
		line-height: 0.86;
		letter-spacing: -3px;
	}
	.feature-art i {
		color: #f04444;
		font-style: normal;
	}
	.feature-copy {
		align-self: center;
		padding: clamp(36px, 6vw, 88px);
	}
	.feature-copy h2 {
		font-size: clamp(2.1rem, 4vw, 3.9rem);
		letter-spacing: -2px;
		margin: 0 0 19px;
	}
	.feature-copy > p:not(.eyebrow) {
		color: #b8b7b3;
		max-width: 410px;
		line-height: 1.65;
		margin-bottom: 31px;
	}
	.outline-button {
		display: inline-block;
		text-decoration: none;
		color: #fff;
		border-bottom: 1px solid #e50914;
		padding-bottom: 7px;
		font-size: 0.9rem;
		font-weight: 700;
	}

	.wide-row {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 13px;
	}
	.wide-card {
		aspect-ratio: 1.55;
		overflow: hidden;
		position: relative;
		background: #222;
	}
	.wide-card::after {
		content: "";
		position: absolute;
		inset: 0;
		background: linear-gradient(transparent 50%, rgba(0, 0, 0, 0.8));
	}
	.wide-card h3 {
		position: absolute;
		z-index: 1;
		left: 13px;
		bottom: 11px;
		margin: 0;
		font-size: 0.8rem;
	}
	.progress {
		position: absolute;
		z-index: 2;
		height: 3px;
		bottom: 0;
		left: 0;
		right: 0;
		background: #666;
	}
	.progress span {
		height: 100%;
		display: block;
		background: #e50914;
	}
	footer {
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		padding: 70px clamp(24px, 6vw, 92px);
		color: #a3a3a3;
		max-width: 1600px;
		margin: 0 auto;
	}
	.footer-question {
		margin: 0 0 30px;
		font-size: 1.05rem;
		color: #a3a3a3;
	}

	.footer-links {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px 35px;
		max-width: 1000px;
		margin-bottom: 35px;
	}
	.footer-links a {
		color: #a3a3a3;
		text-decoration: none;
		font-size: 0.85rem;
		transition: color 0.2s;
	}
	.footer-links a:hover {
		color: #fff;
		text-decoration: underline;
	}
	.footer-language {
		background: transparent;
		border: 1px solid #555;
		color: #a3a3a3;
		border-radius: 4px;
		padding: 10px 20px;
		font-size: 0.9rem;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		transition: all 0.2s;
	}
	.footer-language:hover {
		color: #fff;
		border-color: #555;
	}
	.country, .made-by {
		font-size: 0.85rem;
		margin-top: 24px;
		color: #a3a3a3;
	}
	.made-by {
		margin-top: 8px;
	}

	@media (max-width: 720px) {
		.hero {
			min-height: 730px;
			background-position: 58% center;
		}
		nav {
			height: 76px;
			padding-inline: 20px;
		}
		.brand {
			font-size: 1.3rem;
		}
		.browse-links,
		.language:not(.footer-language) {
			display: none;
		}
		.hero-content {
			margin: 135px 20px 0;
		}
		.hero-copy {
			font-size: 1rem;
		}
		.content {
			padding: 42px 20px 68px;
		}
		.poster-row {
			grid-auto-columns: 142px;
		}
		.feature-panel {
			grid-template-columns: 1fr;
			margin: 70px 0;
		}
		.feature-copy {
			padding: 38px 28px 45px;
		}
		.wide-row,
		.six-up {
			grid-template-columns: repeat(2, 1fr);
		}
		.wide-card:last-child {
			display: none;
		}
		.footer-links {
			grid-template-columns: repeat(2, 1fr);
		}
		footer {
			padding-inline: 28px;
		}
	}

	/* ── Password show/hide toggle ── */
	.pass-wrap {
		position: relative;
		display: flex;
	}
	.pass-wrap input {
		flex: 1;
		padding-right: 42px;
	}
	.eye-btn {
		position: absolute;
		right: 0;
		top: 0;
		bottom: 0;
		width: 42px;
		background: none;
		border: none;
		color: #6e7585;
		font-size: 1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.18s;
	}
	.eye-btn:hover {
		color: #c5cad4;
	}

	/* ── Nav search bar ── */
	.nav-search-bar {
		display: flex;
		align-items: center;
		gap: 10px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		padding: 0 14px;
		flex: 1;
		max-width: 560px;
		backdrop-filter: blur(12px);
	}
	.search-ico {
		color: #9ba3b0;
		font-size: 1.2rem;
		flex-shrink: 0;
	}
	.nav-search-bar input {
		flex: 1;
		background: none;
		border: none;
		outline: none;
		color: #f0f2f5;
		font-size: 0.88rem;
		padding: 10px 0;
	}
	.nav-search-bar input::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}
	.search-close {
		background: none;
		border: none;
		color: #6e7585;
		font-size: 0.8rem;
		cursor: pointer;
		padding: 4px 6px;
		border-radius: 4px;
		transition:
			color 0.15s,
			background 0.15s;
	}
	.search-close:hover {
		color: #fff;
		background: rgba(255, 255, 255, 0.1);
	}
	/* ── Search overlay ── */
	.search-overlay {
		position: absolute;
		top: 100px;
		left: clamp(24px, 6vw, 92px);
		right: clamp(24px, 6vw, 92px);
		z-index: 100;
		background: rgba(10, 10, 10, 0.95);
		backdrop-filter: blur(16px);
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		padding: 24px 32px;
		max-height: 70vh;
		overflow-y: auto;
		box-shadow: 0 24px 48px rgba(0, 0, 0, 0.7);
	}
	.ott-filters {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-bottom: 28px;
	}
	.ott-pill {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 8px 16px;
		border-radius: 50px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.04);
		color: #8a90a0;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}
	.ott-pill .ott-logo {
		font-size: 0.85rem;
		font-weight: 800;
	}
	.ott-pill.active {
		border-color: var(--ott-color);
		background: color-mix(in srgb, var(--ott-color) 15%, transparent);
		color: #fff;
		box-shadow: 0 0 0 1px var(--ott-color);
	}
	.ott-pill:hover:not(.active) {
		border-color: rgba(255, 255, 255, 0.2);
		color: #ddd;
		background: rgba(255, 255, 255, 0.08);
	}

	/* ── Search results ── */
	.search-results-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 16px;
	}
	.result-card {
		display: flex;
		gap: 14px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.07);
		border-radius: 12px;
		overflow: hidden;
		transition:
			border-color 0.2s,
			background 0.2s;
		cursor: default;
		padding: 12px;
	}
	.result-card:hover {
		border-color: rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.07);
	}
	.result-poster {
		flex-shrink: 0;
		width: 72px;
		height: 108px;
		border-radius: 8px;
		overflow: hidden;
		background: #1a1a1a;
		position: relative;
	}
	.result-poster img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.no-poster {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.6rem;
		color: #333;
	}
	.result-rating {
		position: absolute;
		bottom: 4px;
		left: 0;
		right: 0;
		text-align: center;
		font-size: 0.6rem;
		font-weight: 700;
		background: rgba(0, 0, 0, 0.65);
		color: #ffd740;
		padding: 2px 0;
	}
	.result-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.result-info h4 {
		margin: 0;
		font-size: 0.88rem;
		font-weight: 700;
		color: #f0f2f5;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.result-year {
		margin: 0;
		font-size: 0.7rem;
		color: #5e6673;
		font-weight: 600;
	}
	.result-overview {
		margin: 0;
		font-size: 0.72rem;
		color: #7a8292;
		line-height: 1.5;
		flex: 1;
	}
	.result-platforms {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
		margin-top: 6px;
	}
	.platform-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 9px;
		border-radius: 50px;
		border: 1px solid var(--ott-color);
		background: color-mix(in srgb, var(--ott-color) 12%, transparent);
		color: #e8ecf2;
		font-size: 0.65rem;
		font-weight: 700;
		text-decoration: none;
		transition:
			background 0.18s,
			transform 0.15s;
		white-space: nowrap;
	}
	.platform-badge:hover {
		background: color-mix(in srgb, var(--ott-color) 28%, transparent);
		transform: translateY(-1px);
	}
	.badge-active {
		background: color-mix(
			in srgb,
			var(--ott-color) 35%,
			transparent
		) !important;
		box-shadow: 0 0 0 1px var(--ott-color);
		transform: translateY(-1px);
	}

	/* ── Search states ── */
	.search-status {
		padding: 60px 20px;
		text-align: center;
		color: #5e6673;
		font-size: 0.9rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
	}
	.spinner {
		width: 18px;
		height: 18px;
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-top-color: #e50914;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
		flex-shrink: 0;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.search-hint {
		padding: 80px 20px;
		text-align: center;
	}
	.search-hint {
		padding: 80px 20px;
		text-align: center;
	}
	.sh-title {
		font-size: 1.3rem;
		font-weight: 700;
		color: #c5cad4;
		margin: 0 0 10px;
	}
	.sh-sub {
		font-size: 0.85rem;
		color: #4e5563;
		line-height: 1.6;
		margin: 0;
		max-width: 420px;
		margin: 0 auto;
	}

	/* ── Skeleton loading ── */
	@keyframes shimmer {
		0% {
			background-position: -400px 0;
		}
		100% {
			background-position: 400px 0;
		}
	}
	.skeleton {
		background: linear-gradient(
			90deg,
			#1a1a1a 25%,
			#252525 50%,
			#1a1a1a 75%
		) !important;
		background-size: 800px 100% !important;
		animation: shimmer 1.4s infinite;
		border-radius: 4px;
	}

	/* ── Movie card button reset ── */
	.poster-btn {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-align: left;
		width: 100%;
	}

	/* ── Poster card play overlay ── */
	.card-play-btn {
		position: absolute;
		bottom: 40px;
		right: 12px;
		z-index: 2;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: rgba(229, 9, 20, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		opacity: 0;
		transform: scale(0.8);
		transition:
			opacity 0.2s,
			transform 0.2s;
	}
	.poster-card:hover .card-play-btn {
		opacity: 1;
		transform: scale(1);
	}

	/* ── Wide card play overlay ── */
	.wide-card-overlay {
		position: absolute;
		inset: 0;
		z-index: 1;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity 0.2s;
	}
	.wide-card:hover .wide-card-overlay {
		opacity: 1;
	}
	.wc-play {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: rgba(229, 9, 20, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.9rem;
		color: #fff;
		box-shadow: 0 4px 16px rgba(229, 9, 20, 0.4);
	}

	/* ── Play Modal ── */
	.play-modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: rgba(0, 0, 0, 0.85);
		backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}
	.play-modal {
		position: relative;
		width: min(820px, 100%);
		background: #111318;
		border-radius: 18px;
		overflow: hidden;
		box-shadow:
			0 40px 100px rgba(0, 0, 0, 0.8),
			0 0 0 1px rgba(255, 255, 255, 0.08);
		max-height: 90vh;
		overflow-y: auto;
	}
	.pm-close {
		position: absolute;
		top: 14px;
		right: 14px;
		z-index: 10;
		background: rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 50%;
		width: 34px;
		height: 34px;
		color: #fff;
		cursor: pointer;
		font-size: 0.85rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
	}
	.pm-close:hover {
		background: #e50914;
		border-color: #e50914;
	}
	.pm-body {
		display: flex;
		flex-direction: column;
	}
	.pm-video {
		width: 100%;
		max-height: 420px;
		background: #000;
		display: block;
	}
	.pm-no-preview {
		position: relative;
		height: 280px;
		overflow: hidden;
	}
	.pm-no-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: blur(3px) brightness(0.5);
	}
	.pm-no-preview-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		color: #666;
		font-size: 0.85rem;
	}
	.pm-no-preview-overlay span {
		font-size: 2.5rem;
	}
	.pm-info {
		padding: 22px 24px 28px;
		display: flex;
		gap: 28px;
		flex-wrap: wrap;
	}
	.pm-meta {
		flex: 1;
		min-width: 200px;
	}
	.pm-meta h3 {
		margin: 0 0 8px;
		font-size: 1.25rem;
		font-weight: 800;
		color: #f0f2f5;
		letter-spacing: -0.5px;
	}
	.pm-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 12px;
	}
	.pm-tags span {
		padding: 3px 9px;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.07);
		color: #8a90a0;
		font-size: 0.7rem;
		font-weight: 600;
	}
	.rating-tag {
		background: rgba(229, 9, 20, 0.12) !important;
		color: #ff7070 !important;
		border: 1px solid rgba(229, 9, 20, 0.25);
	}
	.pm-desc {
		color: #6e7585;
		font-size: 0.8rem;
		line-height: 1.65;
		margin: 0;
	}
	.pm-watch-on {
		min-width: 200px;
	}
	.pm-watch-label {
		margin: 0 0 12px;
		font-size: 0.72rem;
		font-weight: 700;
		color: #4e5563;
		letter-spacing: 0.5px;
		text-transform: uppercase;
	}
	.pm-platforms {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.pm-platform-btn {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 16px;
		border-radius: 10px;
		border: 1px solid var(--ott-color);
		background: color-mix(in srgb, var(--ott-color) 10%, transparent);
		color: #e8ecf2;
		font-size: 0.8rem;
		font-weight: 700;
		text-decoration: none;
		transition:
			background 0.18s,
			transform 0.15s;
	}
	.pm-platform-btn:hover {
		background: color-mix(in srgb, var(--ott-color) 25%, transparent);
		transform: translateX(3px);
	}
	.pm-plat-logo {
		font-size: 1rem;
		flex-shrink: 0;
	}


	.ott-logo-img {
		height: 18px;
		width: auto;
		object-fit: contain;
	}
	.plat-badge-img {
		height: 14px;
		width: auto;
		object-fit: contain;
		margin-right: 2px;
	}
	.pm-plat-img {
		height: 20px;
		width: auto;
		object-fit: contain;
	}

	/* ── Mobile Responsiveness ── */
	@media (max-width: 768px) {
		nav {
			padding: 0 16px;
			gap: 12px;
		}
		.browse-links {
			display: none; /* Hide links to save space */
		}
		.brand {
			font-size: 1.6rem;
		}
		.hero-content {
			margin: 100px 0 0 16px;
			padding: 0 16px 0 0;
			max-width: 100%;
		}
		.hero-content h1 {
			font-size: 2.4rem;
		}
		.hero-buttons {
			flex-direction: column;
			align-items: stretch;
		}
		.play-button, .info-button {
			width: 100%;
			justify-content: center;
		}
		.search-overlay {
			top: 85px;
			left: 12px;
			right: 12px;
			padding: 16px;
		}
		.ott-filters {
			flex-wrap: nowrap;
			overflow-x: auto;
			padding-bottom: 8px;
		}
		.ott-pill {
			flex-shrink: 0;
		}
		.section-header {
			padding: 0 16px;
		}
		.poster-row {
			padding: 0 16px;
		}
		.shelf {
			margin-left: 16px;
		}

		.footer-links {
			grid-template-columns: repeat(2, 1fr);
			gap: 12px;
		}
		.auth-modal {
			width: 92%;
		}
		.auth-form-panel {
			padding: 32px 24px;
		}
		.auth-brand {
			left: 20px;
			top: 20px;
			font-size: 1.6rem;
		}
		.nav-search-bar {
			position: absolute;
			left: 10px;
			right: 10px;
			top: 12px;
			max-width: none;
			height: 52px;
			z-index: 100;
			background: rgba(20, 20, 20, 0.95);
			box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
			border-radius: 12px;
		}
		.nav-search-bar input {
			font-size: 1rem;
		}
	}
</style>
