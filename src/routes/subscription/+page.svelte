<script>
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { supabase } from "$lib/supabaseClient";

	let user = $state(null);
	let authError = $state("");
	let selectedPlan = $state("Standard");

	const plans = [
		{ name: "Mobile", price: "₹149", quality: "Good", resolution: "480p", devices: "Phone, Tablet", adFree: true, offline: true },
		{ name: "Standard", price: "₹499", quality: "Great", resolution: "1080p", devices: "TV, Computer, Phone, Tablet", adFree: true, offline: true },
		{ name: "Premium", price: "₹649", quality: "Best", resolution: "4K + HDR", devices: "TV, Computer, Phone, Tablet", adFree: true, offline: true },
	];

	onMount(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			user = session?.user ?? null;
		});
		
		const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
			user = session?.user ?? null;
		});

		return () => subscription.unsubscribe();
	});

	async function proceed() {
		if (!user) {
			goto("/");
			return;
		}
		const { data, error } = await supabase.auth.updateUser({
			data: { plan: selectedPlan },
		});
		if (error) authError = error.message;
		else {
			goto("/");
		}
	}

	async function signOut() {
		await supabase.auth.signOut();
		goto("/");
	}
</script>

<div class="page-container">
	<header class="navbar">
		<a class="brand" href="/">STREAMLY</a>
		{#if user}
			<button class="nav-btn" onclick={signOut}>Sign Out</button>
		{:else}
			<button class="nav-btn" onclick={() => goto("/")}>Sign In</button>
		{/if}
	</header>

	<main class="content">
		<a href="/" class="back-link">← Back to Home</a>
		<div class="step-indicator">STEP <b>2</b> OF <b>3</b></div>
		<h1 class="page-title">Choose the plan that's right for you</h1>
		<ul class="benefits">
			<li><span class="check">✓</span> Watch all you want. Ad-free.</li>
			<li><span class="check">✓</span> Recommendations just for you.</li>
			<li><span class="check">✓</span> Change or cancel your plan anytime.</li>
		</ul>

		<div class="plans-container">
			<div class="plan-cards">
				{#each plans as plan}
					<button 
						class="plan-card {selectedPlan === plan.name ? 'active' : ''}"
						onclick={() => selectedPlan = plan.name}
					>
						<div class="plan-name">{plan.name}</div>
						<div class="plan-resolution">{plan.resolution}</div>
						{#if selectedPlan === plan.name}
							<div class="check-circle">✓</div>
						{/if}
					</button>
				{/each}
			</div>

			<div class="feature-table">
				<div class="table-row">
					<div class="feature-label">Monthly price</div>
					{#each plans as plan}
						<div class="feature-value {selectedPlan === plan.name ? 'active-value' : ''}">{plan.price}</div>
					{/each}
				</div>
				<div class="table-row">
					<div class="feature-label">Video and sound quality</div>
					{#each plans as plan}
						<div class="feature-value {selectedPlan === plan.name ? 'active-value' : ''}">{plan.quality}</div>
					{/each}
				</div>
				<div class="table-row">
					<div class="feature-label">Resolution</div>
					{#each plans as plan}
						<div class="feature-value {selectedPlan === plan.name ? 'active-value' : ''}">{plan.resolution}</div>
					{/each}
				</div>
				<div class="table-row">
					<div class="feature-label">Supported devices</div>
					{#each plans as plan}
						<div class="feature-value {selectedPlan === plan.name ? 'active-value' : ''}">{plan.devices}</div>
					{/each}
				</div>
			</div>

			<div class="disclaimer">
				<p>HD (720p), Full HD (1080p), Ultra HD (4K) and HDR availability subject to your internet service and device capabilities. Not all content is available in all resolutions. See our Terms of Use for more details.</p>
				<p>Only people who live with you may use your account. Watch on 4 different devices at the same time with Premium, 2 with Standard, and 1 with Mobile.</p>
			</div>

			<div class="action-row">
				{#if authError}<p class="auth-error">{authError}</p>{/if}
				<button class="btn-primary" onclick={proceed}>Next</button>
			</div>
		</div>
	</main>
</div>

<style>
	.page-container {
		min-height: 100vh;
		background: #000;
		color: #fff;
		font-family: "Inter", sans-serif;
	}
	.navbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 24px 5%;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}
	.brand {
		font-family: "Outfit", "Inter", sans-serif;
		font-weight: 900;
		font-size: 2rem;
		color: #e50914;
		text-decoration: none;
		letter-spacing: -1px;
	}
	.nav-btn {
		background: transparent;
		color: #fff;
		border: none;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: color 0.2s;
	}
	.nav-btn:hover {
		color: #e50914;
		text-decoration: underline;
	}
	.content {
		max-width: 900px;
		margin: 40px auto 100px;
		padding: 0 24px;
	}
	.back-link {
		display: inline-block;
		color: #a3a3a3;
		text-decoration: none;
		font-size: 0.95rem;
		font-weight: 600;
		margin-bottom: 24px;
		transition: color 0.2s;
	}
	.back-link:hover {
		color: #fff;
	}
	.step-indicator {
		font-size: 0.85rem;
		color: #a3a3a3;
		text-transform: uppercase;
		letter-spacing: 1px;
		margin-bottom: 8px;
	}
	.step-indicator b {
		color: #fff;
	}
	.page-title {
		font-size: 2.2rem;
		font-weight: 700;
		margin: 0 0 20px;
		letter-spacing: -0.5px;
	}
	.benefits {
		list-style: none;
		padding: 0;
		margin: 0 0 40px;
		font-size: 1.1rem;
		color: #e5e5e5;
	}
	.benefits li {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 12px;
	}
	.check {
		color: #e50914;
		font-weight: 900;
		font-size: 1.2rem;
	}
	
	.plans-container {
		display: flex;
		flex-direction: column;
	}
	.plan-cards {
		display: flex;
		gap: 16px;
		margin-bottom: 30px;
	}
	.plan-card {
		flex: 1;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 24px;
		text-align: left;
		cursor: pointer;
		position: relative;
		transition: all 0.2s;
		color: #fff;
		display: flex;
		flex-direction: column;
		justify-content: center;
		min-height: 120px;
	}
	.plan-card:hover {
		background: rgba(255, 255, 255, 0.08);
	}
	.plan-card.active {
		background: linear-gradient(135deg, rgba(229, 9, 20, 0.2) 0%, rgba(229, 9, 20, 0) 100%);
		border-color: #e50914;
		box-shadow: 0 4px 20px rgba(229, 9, 20, 0.15);
	}
	.plan-name {
		font-size: 1.3rem;
		font-weight: 800;
		margin-bottom: 6px;
	}
	.plan-resolution {
		font-size: 0.95rem;
		color: #a3a3a3;
		font-weight: 500;
	}
	.plan-card.active .plan-resolution {
		color: #e5e5e5;
	}
	.check-circle {
		position: absolute;
		top: 16px;
		right: 16px;
		width: 24px;
		height: 24px;
		background: #e50914;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.9rem;
		font-weight: 900;
	}

	.feature-table {
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		margin-bottom: 40px;
	}
	.table-row {
		display: flex;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		padding: 20px 0;
	}
	.feature-label {
		flex: 1.2;
		font-size: 1rem;
		color: #a3a3a3;
		display: flex;
		align-items: center;
	}
	.feature-value {
		flex: 1;
		font-size: 0.95rem;
		color: #737373;
		font-weight: 600;
		padding: 0 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
	}
	.feature-value.active-value {
		color: #fff;
	}
	
	.disclaimer {
		font-size: 0.8rem;
		color: #737373;
		line-height: 1.5;
		margin-bottom: 40px;
	}
	.disclaimer p {
		margin: 0 0 12px;
	}
	
	.action-row {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.btn-primary {
		background: #e50914;
		color: #fff;
		border: none;
		border-radius: 4px;
		padding: 18px 48px;
		font-size: 1.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
		width: 100%;
		max-width: 440px;
	}
	.btn-primary:hover {
		background: #f6121d;
	}
	.auth-error {
		color: #e50914;
		margin-bottom: 16px;
		font-weight: 600;
	}

	@media (max-width: 768px) {
		.plan-cards {
			flex-direction: column;
		}
		.table-row {
			flex-direction: column;
			gap: 12px;
			padding: 16px 0;
		}
		.feature-label {
			text-align: center;
			justify-content: center;
			color: #fff;
			font-weight: 600;
			margin-bottom: 8px;
		}
		.feature-value {
			display: none;
		}
		.feature-value.active-value {
			display: flex;
			color: #a3a3a3;
		}
	}
</style>
