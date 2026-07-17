<script>
	import { goto } from "$app/navigation";
</script>

<div class="footer-links-page">
	<nav>
		<a class="brand" href="/">STREAMLY</a>
		<button class="btn-primary" onclick={() => goto("/")}>Back to Home</button>
	</nav>

	<main class="content">
		<h1>Streamly Information</h1>
		<p>This is a dedicated page for footer links. In a full production application, these would navigate to their respective policy and help documents.</p>
		
		<div class="links-list">
			<ul>
				<li><a href="#faq">FAQ</a></li>
				<li><a href="#help">Help Centre</a></li>
				<li><a href="#account">Account</a></li>
				<li><a href="#media">Media Centre</a></li>
				<li><a href="#investor">Investor Relations</a></li>
				<li><a href="#jobs">Jobs</a></li>
				<li><a href="#ways">Ways to Watch</a></li>
				<li><a href="#terms">Terms of Use</a></li>
				<li><a href="#privacy">Privacy Policy</a></li>
				<li><a href="#cookie">Cookie Preferences</a></li>
				<li><a href="#corporate">Corporate Information</a></li>
				<li><a href="#contact">Contact Us</a></li>
				<li><a href="#speed">Speed Test</a></li>
				<li><a href="#legal">Legal Notices</a></li>
				<li><a href="#only">Only on Streamly</a></li>
			</ul>
		</div>
	</main>
</div>

<style>
	.footer-links-page {
		min-height: 100vh;
		background: #090909;
		color: #fff;
		font-family: "Inter", sans-serif;
	}
	nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px 40px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}
	.brand {
		font-family: "Outfit", "Inter", sans-serif;
		font-size: 1.8rem;
		font-weight: 900;
		color: #e50914;
		text-decoration: none;
		letter-spacing: -1px;
	}
	.btn-primary {
		background: #e50914;
		color: white;
		border: none;
		padding: 10px 20px;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 700;
		font-size: 0.9rem;
		transition: background 0.2s, transform 0.2s;
	}
	.btn-primary:hover {
		background: #f6121d;
		transform: translateY(-1px);
	}
	.content {
		max-width: 800px;
		margin: 60px auto;
		padding: 0 20px;
	}
	h1 {
		font-size: 2.5rem;
		margin-bottom: 20px;
		letter-spacing: -0.5px;
	}
	p {
		color: #8a90a0;
		font-size: 1.1rem;
		line-height: 1.6;
		margin-bottom: 40px;
	}
	.links-list ul {
		list-style: none;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 20px;
	}
	.links-list a {
		color: #fff;
		text-decoration: none;
		font-size: 1.1rem;
		transition: color 0.2s;
	}
	.links-list a:hover {
		color: #e50914;
		text-decoration: underline;
	}
	@media (max-width: 600px) {
		.links-list ul {
			grid-template-columns: 1fr;
		}
	}
</style>
