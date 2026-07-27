using System.IdentityModel.Tokens.Jwt;
using FinanceApp.Api.Data;
using FinanceApp.Api.Dtos;
using FinanceApp.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceApp.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class CategoriesController(AppDbContext db) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? throw new InvalidOperationException("Token sin claim 'sub'."));

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoryResponse>>> GetAll([FromQuery] bool includeHidden = false)
    {
        var hiddenIds = await db.HiddenCategories
            .Where(h => h.UserId == CurrentUserId)
            .Select(h => h.CategoryId)
            .ToListAsync();

        var query = db.Categories
            .Where(c => c.UserId == null || c.UserId == CurrentUserId);

        if (!includeHidden)
            query = query.Where(c => !hiddenIds.Contains(c.Id));

        var categories = await query
            .OrderByDescending(c => c.IsSystemDefined)
            .ThenBy(c => c.Name)
            .ToListAsync();

        return categories
            .Select(c => new CategoryResponse(c.Id, c.Name, c.Icon, c.IsSystemDefined, hiddenIds.Contains(c.Id)))
            .ToList();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CategoryResponse>> GetById(Guid id)
    {
        var category = await db.Categories
            .SingleOrDefaultAsync(c => c.Id == id && (c.UserId == null || c.UserId == CurrentUserId));

        if (category is null)
            return NotFound();

        var isHidden = await db.HiddenCategories
            .AnyAsync(h => h.UserId == CurrentUserId && h.CategoryId == id);

        return new CategoryResponse(category.Id, category.Name, category.Icon, category.IsSystemDefined, isHidden);
    }

    [HttpPost]
    public async Task<ActionResult<CategoryResponse>> Create(CategoryRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("El nombre es obligatorio.");

        var normalizedName = request.Name.Trim();

        var nameExists = await db.Categories.AnyAsync(c =>
            (c.UserId == null || c.UserId == CurrentUserId) &&
            c.Name.ToLower() == normalizedName.ToLower());

        if (nameExists)
            return Conflict("Ya tenés una categoría con ese nombre.");

        var category = new Category
        {
            UserId = CurrentUserId,
            Name = normalizedName,
            Icon = request.Icon,
            IsSystemDefined = false,
        };

        db.Categories.Add(category);
        await db.SaveChangesAsync();

        var response = new CategoryResponse(category.Id, category.Name, category.Icon, false, false);
        return CreatedAtAction(nameof(GetById), new { id = category.Id }, response);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CategoryResponse>> Update(Guid id, CategoryRequest request)
    {
        // Solo categorías propias (UserId == CurrentUserId): las del sistema (UserId null)
        // no matchean acá, así que quedan protegidas de edición.
        var category = await db.Categories
            .SingleOrDefaultAsync(c => c.Id == id && c.UserId == CurrentUserId);

        if (category is null)
            return NotFound();

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("El nombre es obligatorio.");

        category.Name = request.Name.Trim();
        category.Icon = request.Icon;

        await db.SaveChangesAsync();

        return new CategoryResponse(category.Id, category.Name, category.Icon, false, false);
    }

    /// <summary>
    /// Categoría propia: se elimina de verdad. Categoría del sistema: no se puede eliminar,
    /// se marca como oculta solo para este usuario (US-08/US-09).
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var category = await db.Categories
            .SingleOrDefaultAsync(c => c.Id == id && (c.UserId == null || c.UserId == CurrentUserId));

        if (category is null)
            return NotFound();

        if (category.IsSystemDefined)
        {
            var alreadyHidden = await db.HiddenCategories
                .AnyAsync(h => h.UserId == CurrentUserId && h.CategoryId == id);

            if (!alreadyHidden)
            {
                db.HiddenCategories.Add(new HiddenCategory { UserId = CurrentUserId, CategoryId = id });
                await db.SaveChangesAsync();
            }

            return NoContent();
        }

        db.Categories.Remove(category);
        await db.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>Revierte el ocultamiento de una categoría del sistema.</summary>
    [HttpPost("{id:guid}/unhide")]
    public async Task<IActionResult> Unhide(Guid id)
    {
        var hidden = await db.HiddenCategories
            .SingleOrDefaultAsync(h => h.UserId == CurrentUserId && h.CategoryId == id);

        if (hidden is null)
            return NotFound();

        db.HiddenCategories.Remove(hidden);
        await db.SaveChangesAsync();

        return NoContent();
    }
}
