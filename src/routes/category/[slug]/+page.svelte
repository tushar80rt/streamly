<script>
	import { page } from '$app/stores';
	import { allMovies } from '../../../movies.js';
	import { fade, scale } from 'svelte/transition';

	let category = $derived($page.params.slug);
	
	let movies = $derived.by(() => {
		switch(category) {
			case 'trending': return allMovies.slice(0, 25).map((m, i) => ({ ...m, rank: String(i+1).padStart(2,'0') }));
			case 'popular': return allMovies.slice(25, 50);
			case 'picks': return allMovies.slice(50, 75);
			case 'continue': return allMovies.slice(75, 100).map((m, i) => ({ ...m, progress: Math.floor(Math.random() * 80) + 10 }));
			default: return allMovies.slice(0, 25);
		}
	});
	
	let title = $derived.by(() => {
		switch(category) {
			case 'trending': return 'Trending now';
			case 'popular': return 'Popular Movies';
			case 'picks': return 'Top Picks for You';
			case 'continue': return 'Continue Watching';
			default: return 'Movies';
		}
	});

	function posterUrl(m) {
		if (!m?.artworkUrl100) return '';
		return m.artworkUrl100.replace('100x100bb', '500x750bb');
	}

	// Play modal state
	let playModalOpen = $state(false);
	let activeMovie = $state(null);

	function openPlayer(m) {
		activeMovie = m;
		playModalOpen = true;
	}

	function closePlayer() {
		playModalOpen = false;
		setTimeout(() => { activeMovie = null; }, 300);
	}
</script>

<svelte:head>
	<title>{title} - Streamly</title>
</svelte:head>

<!-- Header -->
<header class="app-header">
	<div class="header-left">
		<a href="/" class="logo">STREAMLY</a>
	</div>
</header>

<main class="category-page">
	<div class="header-section">
		<a href="/" class="back-btn">&larr; Back to Home</a>
		<h1>{title}</h1>
	</div>

	<div class="movie-grid">
		{#each movies as m}
			<button class="movie-card" onclick={() => openPlayer(m)}>
				<div class="poster">
					<img src={posterUrl(m)} alt={m.trackName} loading="lazy" />
					{#if m.rank}
						<div class="rank-badge">{m.rank}</div>
					{/if}
					{#if m.progress}
						<div class="progress-bar"><div class="progress-fill" style="width: {m.progress}%"></div></div>
					{/if}
				</div>
				<div class="movie-info">
					<p class="title">{m.trackName}</p>
					{#if m.releaseDate}<p class="year">{m.releaseDate}</p>{/if}
				</div>
			</button>
		{/each}
	</div>
</main>

<!-- Play Modal -->
{#if playModalOpen && activeMovie}
	<div class="play-modal-backdrop" transition:fade={{duration: 200}}>
		<button class="close-modal-bg" aria-label="Close" onclick={closePlayer}></button>
		
		<div class="play-modal-content" transition:scale={{duration: 300, start: 0.95}}>
			<button class="close-btn" onclick={closePlayer}>&times;</button>
			
			<div class="video-container">
				<iframe 
					src="https://www.youtube.com/embed?listType=search&list={encodeURIComponent(activeMovie.trackName + ' trailer')}&autoplay=1" 
					title="Trailer"
					frameborder="0" 
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
					allowfullscreen>
				</iframe>
			</div>
			
			<div class="modal-info">
				<h2>{activeMovie.trackName}</h2>
				<p class="meta">
					{#if activeMovie.releaseDate}<span>{activeMovie.releaseDate}</span>{/if}
					{#if activeMovie.primaryGenreName}<span class="genre">{activeMovie.primaryGenreName}</span>{/if}
				</p>
				<p class="desc">{activeMovie.overview || 'Get ready for an epic cinematic experience with ' + activeMovie.trackName + '.'}</p>
				
				<div class="watch-options">
					<h3>Watch Full Movie On:</h3>
					<div class="ott-links">
						<a href={`https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(activeMovie.trackName)}`} target="_blank" rel="noopener noreferrer" class="ott-btn prime">
							<span class="icon">P</span> Prime Video
						</a>
						<a href={`https://www.netflix.com/search?q=${encodeURIComponent(activeMovie.trackName)}`} target="_blank" rel="noopener noreferrer" class="ott-btn netflix">
							<span class="icon">N</span> Netflix
						</a>
						<a href={`https://www.hotstar.com/in/explore?searchQuery=${encodeURIComponent(activeMovie.trackName)}`} target="_blank" rel="noopener noreferrer" class="ott-btn hotstar">
							<span class="icon">H</span> Hotstar
						</a>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.app-header {
		position: fixed;
		top: 0; left: 0; right: 0;
		height: 70px;
		background: rgba(10, 10, 10, 0.85);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		display: flex;
		align-items: center;
		padding: 0 4%;
		z-index: 100;
		border-bottom: 1px solid rgba(255,255,255,0.05);
	}
	.logo {
		color: #e50914;
		font-size: 1.5rem;
		font-weight: 900;
		text-decoration: none;
		letter-spacing: 1px;
	}

	.category-page {
		padding: 100px 4% 60px;
		min-height: 100vh;
	}

	.header-section {
		margin-bottom: 30px;
	}

	.back-btn {
		display: inline-block;
		color: #aaa;
		text-decoration: none;
		font-size: 0.9rem;
		margin-bottom: 15px;
		transition: color 0.2s;
	}
	.back-btn:hover {
		color: #fff;
	}

	.header-section h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0;
	}

	.movie-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 25px;
	}

	.movie-card {
		background: transparent;
		border: none;
		padding: 0;
		text-align: left;
		cursor: pointer;
		transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
		display: flex;
		flex-direction: column;
	}

	.movie-card:hover {
		transform: scale(1.05);
	}

	.poster {
		width: 100%;
		aspect-ratio: 2/3;
		border-radius: 8px;
		overflow: hidden;
		position: relative;
		background: #222;
		box-shadow: 0 10px 20px rgba(0,0,0,0.3);
		margin-bottom: 12px;
	}

	.poster img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.3s;
	}

	.rank-badge {
		position: absolute;
		top: 10px; left: 10px;
		background: #e50914;
		color: white;
		font-weight: 800;
		font-size: 0.8rem;
		padding: 4px 8px;
		border-radius: 4px;
		letter-spacing: 1px;
	}

	.progress-bar {
		position: absolute;
		bottom: 0; left: 0; right: 0;
		height: 4px;
		background: rgba(255,255,255,0.3);
	}

	.progress-fill {
		height: 100%;
		background: #e50914;
	}

	.movie-info .title {
		font-size: 1rem;
		font-weight: 600;
		color: #fff;
		margin: 0 0 4px 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.movie-info .year {
		font-size: 0.85rem;
		color: #888;
		margin: 0;
	}

	@media (max-width: 768px) {
		.movie-grid {
			grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
			gap: 15px;
		}
		.header-section h1 { font-size: 2rem; }
	}

	/* PLAY MODAL (Reused styles) */
	.play-modal-backdrop {
		position: fixed;
		top: 0; left: 0; right: 0; bottom: 0;
		background: rgba(0,0,0,0.85);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}
	.close-modal-bg {
		position: absolute;
		top: 0; left: 0; right: 0; bottom: 0;
		width: 100%;
		height: 100%;
		background: transparent;
		border: none;
		cursor: default;
	}
	.play-modal-content {
		position: relative;
		width: 100%;
		max-width: 900px;
		background: #141414;
		border-radius: 16px;
		overflow: hidden;
		box-shadow: 0 25px 50px rgba(0,0,0,0.5);
		border: 1px solid rgba(255,255,255,0.1);
		max-height: 90vh;
		overflow-y: auto;
	}
	.close-btn {
		position: absolute;
		top: 15px; right: 15px;
		width: 40px; height: 40px;
		border-radius: 50%;
		background: rgba(0,0,0,0.5);
		color: white;
		border: 1px solid rgba(255,255,255,0.2);
		font-size: 24px;
		cursor: pointer;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}
	.close-btn:hover {
		background: white;
		color: black;
		transform: scale(1.1);
	}
	.video-container {
		width: 100%;
		aspect-ratio: 16/9;
		background: #000;
	}
	.video-container iframe {
		width: 100%;
		height: 100%;
	}
	.modal-info {
		padding: 30px;
	}
	.modal-info h2 {
		font-size: 2.5rem;
		margin: 0 0 10px 0;
	}
	.modal-info .meta {
		display: flex;
		gap: 15px;
		color: #aaa;
		font-size: 0.95rem;
		margin-bottom: 20px;
		align-items: center;
	}
	.genre {
		background: rgba(255,255,255,0.1);
		padding: 4px 10px;
		border-radius: 4px;
		color: #fff;
	}
	.modal-info .desc {
		font-size: 1.1rem;
		line-height: 1.6;
		color: #ccc;
		margin-bottom: 30px;
		max-width: 800px;
	}
	.watch-options {
		border-top: 1px solid rgba(255,255,255,0.1);
		padding-top: 25px;
	}
	.watch-options h3 {
		font-size: 1.1rem;
		margin-bottom: 15px;
		color: #eee;
	}
	.ott-links {
		display: flex;
		gap: 15px;
		flex-wrap: wrap;
	}
	.ott-btn {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 24px;
		border-radius: 8px;
		text-decoration: none;
		color: white;
		font-weight: 600;
		font-size: 1rem;
		transition: transform 0.2s, filter 0.2s;
	}
	.ott-btn:hover {
		transform: translateY(-2px);
		filter: brightness(1.2);
	}
	.ott-btn.prime { background: #00A8E1; }
	.ott-btn.netflix { background: #E50914; }
	.ott-btn.hotstar { background: #032541; }
	.ott-btn .icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px; height: 24px;
		background: rgba(0,0,0,0.2);
		border-radius: 4px;
		font-size: 0.8rem;
	}
</style>
